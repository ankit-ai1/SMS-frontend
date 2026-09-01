/**
 * API client for the School Management System backend.
 *
 * Multi-tenancy: the backend resolves the tenant from the request Host
 * (e.g. `sunrise.lvh.me:8080`). A browser can neither set `Host` nor call that
 * origin without CORS, so requests go to same-origin `/api/*` and the Next
 * rewrite in `next.config.ts` forwards them server-side — which both sets the
 * right Host and sidesteps CORS entirely.
 *
 * `X-Tenant-Subdomain` rides along on every request so the backend can resolve
 * the tenant by header instead, if Host-based resolution is ever unavailable.
 */

export const TENANT = process.env.NEXT_PUBLIC_TENANT ?? "sunrise";

/**
 * Empty by design: requests stay same-origin and are proxied by the rewrite.
 * Set NEXT_PUBLIC_API_URL to an absolute origin to bypass the proxy and call
 * the backend directly — that path then requires CORS on the backend.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const TOKEN_STORAGE_KEY = "sms.auth.token";
const USER_STORAGE_KEY = "sms.auth.user";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** The envelope every backend endpoint responds with. */
export type ApiEnvelope<T> = {
  status: string;
  data: T | null;
  error: ApiErrorBody | null;
  /** Only list endpoints send this. */
  meta?: PageMeta;
};

/** The `meta` block paginated list endpoints return alongside `data`. */
export type PageMeta = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

/** A list endpoint's response, flattened for the UI. */
export type Page<T> = {
  items: T[];
  meta: PageMeta;
};

export type ApiErrorBody = {
  code?: string;
  message: string;
  details?: unknown;
};

export type LoginResponse = {
  token: string;
  user?: AuthUser;
  [key: string]: unknown;
};

export type AuthUser = {
  id?: string | number;
  email?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
};

/** Thrown for any non-successful response. Carries the backend's error code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code;
    this.details = body?.details;
  }
}

/**
 * True when the backend refused a write because the record is still referenced
 * elsewhere (HTTP 409). Its message names what holds the reference, so it is
 * worth surfacing verbatim rather than replacing with a generic line.
 */
export function isConflictError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.status === 409 || error.code === "CONFLICT")
  );
}

/**
 * True when the signed-in user may not touch this record (HTTP 403). Teacher
 * scoping is enforced backend-side, so a teacher who reaches another teacher's
 * section lands here rather than on a generic failure.
 */
export function isForbiddenError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.status === 403 || error.code === "FORBIDDEN")
  );
}

/* -------------------------------------------------------------------------- */
/*                                Token storage                               */
/* -------------------------------------------------------------------------- */

/**
 * Kept in memory so requests never block on localStorage, and mirrored to
 * localStorage so a page reload stays authenticated.
 */
let memoryToken: string | null = null;

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;

  try {
    memoryToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Private mode / storage disabled — memory-only is still fine.
    memoryToken = null;
  }
  return memoryToken;
}

export function setToken(token: string): void {
  memoryToken = token;
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore: the in-memory copy carries this session.
  }
}

export function clearToken(): void {
  memoryToken = null;
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/** Signed-in user, cached next to the token so a reload keeps the chrome filled in. */
let memoryUser: AuthUser | null = null;

export function getUser(): AuthUser | null {
  if (memoryUser) return memoryUser;
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    memoryUser = raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    memoryUser = null;
  }
  return memoryUser;
}

export function setUser(user: AuthUser): void {
  memoryUser = user;
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Ignore.
  }
}

export function clearUser(): void {
  memoryUser = null;
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

/** Drops every trace of the session — used on sign-out and on a rejected token. */
export function clearSession(): void {
  clearToken();
  clearUser();
}

/* -------------------------------------------------------------------------- */
/*                                  Requests                                  */
/* -------------------------------------------------------------------------- */

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function buildHeaders(init?: RequestInit, withAuth = false): Headers {
  const headers = new Headers(init?.headers);

  headers.set("X-Tenant-Subdomain", TENANT);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  // Only declare a JSON body when there actually is one, and never override an
  // explicit Content-Type (FormData needs the browser to set its own boundary).
  const hasBody = init?.body !== undefined && init.body !== null;
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (withAuth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

/**
 * Parses the `{ status, data, error }` envelope, throwing ApiError when the
 * call failed. Returns the whole envelope so paginated endpoints can read the
 * sibling `meta` block; `unwrap` narrows it to just `data`.
 */
async function parseEnvelope<T>(
  response: Response
): Promise<Partial<ApiEnvelope<T>> | null> {
  const raw = await response.text();

  let envelope: Partial<ApiEnvelope<T>> | null = null;
  if (raw) {
    try {
      envelope = JSON.parse(raw) as Partial<ApiEnvelope<T>>;
    } catch {
      envelope = null;
    }
  }

  if (!response.ok || envelope?.error) {
    const message =
      envelope?.error?.message ??
      (raw && !envelope ? raw.slice(0, 200) : "") ??
      "";

    throw new ApiError(
      message || `Request failed with status ${response.status}`,
      response.status,
      envelope?.error ?? undefined
    );
  }

  return envelope;
}

/** Unwraps `{ status, data, error }` down to `data`. */
async function unwrap<T>(response: Response): Promise<T> {
  const envelope = await parseEnvelope<T>(response);

  if (envelope === null) {
    // 204 and friends: nothing to unwrap.
    return undefined as T;
  }

  // Tolerate endpoints that return a bare payload instead of the envelope.
  return (envelope.data ?? (envelope as T)) as T;
}

/** Unauthenticated request. Use `authedFetch` for anything behind login. */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: buildHeaders(options, false),
  });

  return unwrap<T>(response);
}

/** Authenticated request — attaches `Authorization: Bearer <token>`. */
export async function authedFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: buildHeaders(options, true),
  });

  // A rejected token is worthless — drop it so the UI can send the user back
  // to /login instead of retrying with a credential we know is dead.
  if (response.status === 401) {
    clearSession();
  }

  return unwrap<T>(response);
}

/**
 * Authenticated list request. Unlike `authedFetch` this keeps the envelope's
 * `meta` block — that is what the pagination controls are driven from.
 */
export async function authedFetchPage<T>(
  path: string,
  options: RequestInit = {}
): Promise<Page<T>> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: buildHeaders(options, true),
  });

  if (response.status === 401) {
    clearSession();
  }

  const envelope = await parseEnvelope<T[]>(response);
  const data = envelope?.data;
  const items = Array.isArray(data) ? data : [];

  // A backend that omits `meta` still gets working controls: one full page.
  return {
    items,
    meta: envelope?.meta ?? {
      page: 1,
      per_page: items.length,
      total: items.length,
      total_pages: 1,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                    Auth                                    */
/* -------------------------------------------------------------------------- */

/** Logs in and stores the returned token. Throws ApiError on bad credentials. */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const token =
    result?.token ??
    (result as Record<string, unknown> | null)?.["accessToken"] ??
    (result as Record<string, unknown> | null)?.["access_token"];

  if (typeof token !== "string" || !token) {
    throw new ApiError("Login succeeded but no token was returned.", 200);
  }

  setToken(token);
  if (result?.user && typeof result.user === "object") {
    setUser(result.user);
  }
  return { ...result, token };
}

export function logout(): void {
  clearSession();
}

/**
 * Refreshes the cached user. The shell calls this only when nothing was stored
 * at login, so a missing or differently-shaped endpoint degrades to the
 * fallbacks in the UI rather than breaking the page.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const user = await authedFetch<AuthUser>("/api/v1/auth/me");
    if (user && typeof user === "object") {
      setUser(user);
      return user;
    }
  } catch {
    // Non-fatal: the chrome falls back to the email/initials it already has.
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                 Dashboard                                  */
/* -------------------------------------------------------------------------- */

export type UpcomingEvent = {
  id: string | number;
  title: string;
  event_type: string;
  start_date: string;
};

export type AdminDashboard = {
  students_total: number;
  staff_total: number;
  fees_collected_this_month: number;
  fees_pending: number;
  upcoming_events: UpcomingEvent[];
};

export function getAdminDashboard(): Promise<AdminDashboard> {
  return authedFetch<AdminDashboard>("/api/v1/dashboard/admin");
}

/**
 * The principal's read-only twin of the admin dashboard: identical figures for
 * the whole school, on its own route. `/dashboard/admin` stays closed to the
 * role, so this is not interchangeable with it.
 */
export type PrincipalDashboard = AdminDashboard;

export function getPrincipalDashboard(): Promise<PrincipalDashboard> {
  return authedFetch<PrincipalDashboard>("/api/v1/dashboard/principal");
}

/**
 * The accountant's dashboard. Only the two fee figures are read from it — the
 * roll and staff counts ride along because the payload is shared with the other
 * dashboards, not because the finance screens show them.
 */
export type AccountantDashboard = AdminDashboard;

export function getAccountantDashboard(): Promise<AccountantDashboard> {
  return authedFetch<AccountantDashboard>("/api/v1/dashboard/accountant");
}

/** One period on the teacher's board for today. */
export type TimetableSlot = {
  id: string | number;
  section_id: string | number;
  slot?: string | null;
  subject?: string | null;
  section_name?: string | null;
  class_name?: string | null;
};

/**
 * A section the teacher is assigned to. The dashboard may send `my_sections`
 * either as a plain count or as these rows, so both are accepted.
 */
export type TeacherSectionRef = {
  id: string | number;
  name?: string | null;
  class_id?: string | number | null;
  class_name?: string | null;
  academic_year_id?: string | number | null;
};

export type TeacherDashboard = {
  my_sections?: number | TeacherSectionRef[] | null;
  todays_timetable?: TimetableSlot[] | null;
  pending_leave_requests?: LeaveRequest[] | null;
};

export function getTeacherDashboard(): Promise<TeacherDashboard> {
  return authedFetch<TeacherDashboard>("/api/v1/dashboard/teacher");
}

/** How many sections the teacher holds, whichever shape `my_sections` took. */
export function teacherSectionCount(
  dashboard: TeacherDashboard | null
): number | null {
  const value = dashboard?.my_sections;
  if (Array.isArray(value)) return value.length;
  return typeof value === "number" ? value : null;
}

/* -------------------------------------------------------------------------- */
/*                                  Parent                                    */
/* -------------------------------------------------------------------------- */

export type ParentChild = {
  id: string | number;
  first_name: string;
  last_name: string;
  class_name?: string | null;
  section_name?: string | null;
  attendance_pct?: number | null;
  fees_due?: number | null;
  enrollment_id?: string | number | null;
};

export type ParentDashboard = {
  children?: ParentChild[] | null;
  unread_notifications?: number | null;
};

export function getParentDashboard(): Promise<ParentDashboard> {
  return authedFetch<ParentDashboard>("/api/v1/dashboard/parent");
}

/* -------------------------------------------------------------------------- */
/*                                  Student                                   */
/* -------------------------------------------------------------------------- */

/**
 * The signed-in student, as their own portal sees them. Deliberately the same
 * shape as `ParentChild`: a student portal is a parent portal with exactly one
 * subject, so the screens differ only in who is looking.
 */
export type StudentSelf = {
  id: string | number;
  first_name: string;
  last_name: string;
  admission_number?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  attendance_pct?: number | null;
  fees_due?: number | null;
  enrollment_id?: string | number | null;
};

export type StudentDashboard = {
  student?: StudentSelf | null;
  unread_notifications?: number | null;
};

/**
 * Resolves the caller to their own student record. It has to exist as its own
 * route: a student's token carries a user id, not a student id, so without this
 * the portal has no id to fetch attendance, fees or report cards with.
 */
export function getStudentDashboard(): Promise<StudentDashboard> {
  return authedFetch<StudentDashboard>("/api/v1/dashboard/student");
}

export type StudentAttendanceEntry = {
  id?: string | number;
  date: string;
  status: string;
  remarks?: string | null;
  subject?: string | null;
  section_name?: string | null;
};

export type StudentAttendance = {
  history: StudentAttendanceEntry[];
  attendance_pct?: number | null;
  total_days?: number | null;
  present_days?: number | null;
};

type StudentAttendancePayload =
  | StudentAttendanceEntry[]
  | (Partial<StudentAttendance> & {
      records?: StudentAttendanceEntry[] | null;
      items?: StudentAttendanceEntry[] | null;
      data?: StudentAttendanceEntry[] | null;
      summary?: {
        attendance_pct?: number | null;
        present_pct?: number | null;
        total_days?: number | null;
        present_days?: number | null;
      } | null;
    });

export async function getStudentAttendance(
  studentId: string | number
): Promise<StudentAttendance> {
  const payload = await authedFetch<StudentAttendancePayload>(
    `/api/v1/students/${studentId}/attendance`
  );

  if (Array.isArray(payload)) return { history: payload };

  const history =
    payload.history ??
    payload.records ??
    payload.items ??
    payload.data ??
    [];
  const summary = payload.summary ?? null;

  return {
    history: Array.isArray(history) ? history : [],
    attendance_pct:
      payload.attendance_pct ?? summary?.attendance_pct ?? summary?.present_pct,
    total_days: payload.total_days ?? summary?.total_days,
    present_days: payload.present_days ?? summary?.present_days,
  };
}


/* -------------------------------------------------------------------------- */
/*                                  Students                                  */
/* -------------------------------------------------------------------------- */

export type Gender = "male" | "female";

export type Student = {
  id: string | number;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  /** Backend casing varies, so treat it as free text and normalise for display. */
  gender: string;
  is_active: boolean;
};

export type StudentQuery = {
  page?: number;
  per_page?: number;
  /** Free text — the backend matches it against name and admission number. */
  search?: string;
  /** Empty string means "no filter". */
  gender?: Gender | "";
};

export function listStudents({
  page = 1,
  per_page = 20,
  search = "",
  gender = "",
}: StudentQuery = {}): Promise<Page<Student>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });

  // Omitted rather than sent empty: a blank `search` would filter on "".
  const trimmed = search.trim();
  if (trimmed) params.set("search", trimmed);
  if (gender) params.set("gender", gender);

  return authedFetchPage<Student>(`/api/v1/students?${params.toString()}`);
}

/** The create payload. Everything after `gender` is optional. */
export type NewStudent = {
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  blood_group?: string;
  admission_date?: string;
  nationality?: string;
  religion?: string;
  category?: string;
};

export function createStudent(
  input: NewStudent
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/students", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Ids come back as strings or numbers depending on the endpoint. */
export function sameId(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): boolean {
  return a != null && b != null && String(a) === String(b);
}

/** The full row `GET /api/v1/students/:id` returns. */
export type StudentDetail = Student & {
  blood_group?: string | null;
  admission_date?: string | null;
  nationality?: string | null;
  religion?: string | null;
  category?: string | null;
  photo_url?: string | null;
};

export function getStudent(id: string | number): Promise<StudentDetail> {
  return authedFetch<StudentDetail>(`/api/v1/students/${id}`);
}

/** Every field the update endpoint accepts. Send only what changed. */
export type StudentPatch = {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: Gender;
  blood_group?: string;
  nationality?: string;
  religion?: string;
  category?: string;
  photo_url?: string;
  is_active?: boolean;
};

export function updateStudent(
  id: string | number,
  patch: StudentPatch
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/students/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

/** Soft-delete — the record stays, it just leaves the roll. */
export function deleteStudent(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/students/${id}`, {
    method: "DELETE",
  });
}

/* -------------------------------------------------------------------------- */
/*                                 Guardians                                  */
/* -------------------------------------------------------------------------- */

export type Guardian = {
  id: string | number;
  name: string;
  relation: string;
  phone?: string | null;
  email?: string | null;
  is_primary: boolean;
  /** Set once a parent login exists for this guardian; absent until then. */
  user_id?: string | number | null;
  /** The address that login signs in with — not necessarily `email`. */
  user_email?: string | null;
};

export type NewGuardian = {
  name: string;
  relation: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
};

export async function listGuardians(
  studentId: string | number
): Promise<Guardian[]> {
  const data = await authedFetch<Guardian[]>(
    `/api/v1/students/${studentId}/guardians`
  );
  return Array.isArray(data) ? data : [];
}

export function createGuardian(
  studentId: string | number,
  input: NewGuardian
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>(
    `/api/v1/students/${studentId}/guardians`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Documents                                  */
/* -------------------------------------------------------------------------- */

export type StudentDocument = {
  id: string | number;
  doc_type: string;
  gcs_path: string;
  uploaded_at: string;
  /**
   * Everything below is sent by backends that store the upload itself rather
   * than just a path. All optional: a record created before uploads existed
   * carries only `gcs_path`, and the UI falls back to that.
   */
  file_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
};

export type NewDocument = {
  doc_type: string;
  gcs_path: string;
};

export async function listDocuments(
  studentId: string | number
): Promise<StudentDocument[]> {
  const data = await authedFetch<StudentDocument[]>(
    `/api/v1/students/${studentId}/documents`
  );
  return Array.isArray(data) ? data : [];
}

export function createDocument(
  studentId: string | number,
  input: NewDocument
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>(
    `/api/v1/students/${studentId}/documents`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

/* --------------------------- Document file transfer ----------------------- */

/**
 * Uploads the file itself, rather than recording a path somebody else uploaded.
 * Sent as `multipart/form-data`: `buildHeaders` deliberately leaves
 * Content-Type unset for FormData so the browser can add its own boundary.
 */
export function uploadDocument(
  studentId: string | number,
  input: { doc_type: string; file: File }
): Promise<StudentDocument> {
  const form = new FormData();
  form.append("doc_type", input.doc_type);
  form.append("file", input.file, input.file.name);

  return authedFetch<StudentDocument>(
    `/api/v1/students/${studentId}/documents`,
    { method: "POST", body: form }
  );
}

/**
 * Swaps the file behind an existing record, keeping its id and type. Used for
 * the "wrong scan, send it again" case, which is otherwise a delete plus a
 * re-upload and loses the record's history.
 */
export function replaceDocumentFile(
  studentId: string | number,
  documentId: string | number,
  file: File
): Promise<StudentDocument> {
  const form = new FormData();
  form.append("file", file, file.name);

  return authedFetch<StudentDocument>(
    `/api/v1/students/${studentId}/documents/${documentId}/file`,
    { method: "PUT", body: form }
  );
}

/** Pulls the original filename out of a Content-Disposition header. */
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  // RFC 5987 form first — it carries the encoded, non-ASCII-safe name.
  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // Fall through to the plain form.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || null;
}

/**
 * Fetches the stored file as a blob.
 *
 * It cannot be a plain `<a href>`: the endpoint is behind the bearer token and
 * a link element sends no Authorization header. The caller turns the blob into
 * an object URL and clicks that instead.
 */
export async function downloadDocument(
  studentId: string | number,
  documentId: string | number
): Promise<{ blob: Blob; fileName: string | null }> {
  const response = await fetch(
    buildUrl(`/api/v1/students/${studentId}/documents/${documentId}/file`),
    { headers: buildHeaders({}, true) }
  );

  if (response.status === 401) {
    clearSession();
  }

  if (!response.ok) {
    // The error path is still JSON, so read it the way every other call does.
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as Partial<ApiEnvelope<unknown>>;
      message = body?.error?.message ?? message;
    } catch {
      // A non-JSON error body leaves the status line as the message.
    }
    throw new ApiError(message, response.status);
  }

  return {
    blob: await response.blob(),
    fileName: filenameFromDisposition(
      response.headers.get("Content-Disposition")
    ),
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Medical                                   */
/* -------------------------------------------------------------------------- */

/** `data` is null until a record has been saved for the student. */
export type MedicalInfo = {
  allergies?: string | null;
  conditions?: string | null;
  medications?: string | null;
  notes?: string | null;
};

export function getMedical(
  studentId: string | number
): Promise<MedicalInfo | null> {
  return authedFetch<MedicalInfo | null>(
    `/api/v1/students/${studentId}/medical`
  );
}

export function updateMedical(
  studentId: string | number,
  patch: MedicalInfo
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(
    `/api/v1/students/${studentId}/medical`,
    { method: "PUT", body: JSON.stringify(patch) }
  );
}

/* -------------------------------------------------------------------------- */
/*                        Academic structure & enrolment                      */
/* -------------------------------------------------------------------------- */

export type AcademicYear = {
  id: string | number;
  name?: string | null;
  is_current?: boolean;
  start_date?: string | null;
  end_date?: string | null;
};

export type SchoolClass = {
  id: string | number;
  name: string;
  numeric_order?: number | null;
};

export type Section = {
  id: string | number;
  name: string;
  class_id?: string | number | null;
  class_name?: string | null;
  academic_year_id?: string | number | null;
  capacity?: number | null;
};


export type Enrollment = {
  id: string | number;
  student_id: string | number;
  section_id: string | number;
  academic_year_id: string | number;
  roll_number?: string | number | null;
  section_name?: string | null;
  class_name?: string | null;
};

export type NewEnrollment = {
  student_id: string | number;
  section_id: string | number;
  academic_year_id: string | number;
  roll_number?: string;
};

async function authedList<T>(path: string): Promise<T[]> {
  const data = await authedFetch<T[]>(path);
  return Array.isArray(data) ? data : [];
}

export function listAcademicYears(): Promise<AcademicYear[]> {
  return authedList<AcademicYear>("/api/v1/academic-years");
}

/** The year flagged `is_current`, falling back to the first one on file. */
export async function getCurrentAcademicYear(): Promise<AcademicYear | null> {
  const years = await listAcademicYears();
  return years.find((year) => year.is_current) ?? years[0] ?? null;
}

export function listClasses(): Promise<SchoolClass[]> {
  return authedList<SchoolClass>("/api/v1/classes");
}

export type NewSchoolClass = { name: string; numeric_order: number };
export type SchoolClassPatch = { name?: string; numeric_order?: number };

export function createClass(
  input: NewSchoolClass
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/classes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateClass(
  id: string | number,
  patch: SchoolClassPatch
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/classes/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

/** Rejected with 409 while any section still hangs off this class. */
export function deleteClass(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/classes/${id}`, {
    method: "DELETE",
  });
}

export function listSections(
  academicYearId?: string | number | null
): Promise<Section[]> {
  const query = academicYearId
    ? `?academic_year_id=${encodeURIComponent(String(academicYearId))}`
    : "";
  return authedList<Section>(`/api/v1/sections${query}`);
}

/**
 * The sections assigned to the signed-in teacher, across the years they hold.
 * Scoped backend-side from the bearer token, so it needs no filter of its own
 * and is the only list a teacher screen should offer.
 */
export function listMySections(): Promise<Section[]> {
  return authedList<Section>("/api/v1/sections/mine");
}

export type NewSection = {
  class_id: string | number;
  academic_year_id: string | number;
  name: string;
  capacity?: number;
};
export type SectionPatch = { name?: string; capacity?: number };

export function createSection(
  input: NewSection
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/sections", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSection(
  id: string | number,
  patch: SectionPatch
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/sections/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

/** Rejected with 409 while any enrolment still points at this section. */
export function deleteSection(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/sections/${id}`, {
    method: "DELETE",
  });
}

export type NewAcademicYear = {
  name: string;
  start_date: string;
  end_date: string;
};
export type AcademicYearPatch = Partial<NewAcademicYear>;

export function createAcademicYear(
  input: NewAcademicYear
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/academic-years", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAcademicYear(
  id: string | number,
  patch: AcademicYearPatch
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/academic-years/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function setCurrentAcademicYear(
  id: string | number
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(
    `/api/v1/academic-years/${id}/set-current`,
    { method: "PUT" }
  );
}

/** Rejected with 409 while sections, terms, or enrolments reference the year. */
export function deleteAcademicYear(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/academic-years/${id}`, {
    method: "DELETE",
  });
}

export type EnrollmentQuery = {
  academic_year_id?: string | number | null;
  section_id?: string | number | null;
  student_id?: string | number | null;
};

export function listEnrollments(query: EnrollmentQuery = {}): Promise<
  Enrollment[]
> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }

  const suffix = params.toString();
  return authedList<Enrollment>(
    `/api/v1/enrollments${suffix ? `?${suffix}` : ""}`
  );
}

/**
 * The student's enrolment for a year. `student_id` is sent as a filter and the
 * result is narrowed again here, so this is correct whether or not the backend
 * honours that parameter.
 */
export async function getStudentEnrollment(
  studentId: string | number,
  academicYearId: string | number
): Promise<Enrollment | null> {
  const enrollments = await listEnrollments({
    academic_year_id: academicYearId,
    student_id: studentId,
  });

  return (
    enrollments.find((enrollment) =>
      sameId(enrollment.student_id, studentId)
    ) ?? null
  );
}

export function createEnrollment(
  input: NewEnrollment
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/enrollments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* -------------------------------------------------------------------------- */
/*                        Guardian & document mutations                       */
/* -------------------------------------------------------------------------- */

/**
 * NOTE: the sub-resource update/delete routes below are assumed to mirror the
 * create routes. They are not confirmed against the backend — every path there
 * answers 401 before routing, so a probe cannot tell an existing route from a
 * missing one. If the backend does not have them yet, these four calls are the
 * ones that will 404.
 */

export function updateGuardian(
  studentId: string | number,
  guardianId: string | number,
  patch: Partial<NewGuardian>
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(
    `/api/v1/students/${studentId}/guardians/${guardianId}`,
    { method: "PUT", body: JSON.stringify(patch) }
  );
}

export function deleteGuardian(
  studentId: string | number,
  guardianId: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(
    `/api/v1/students/${studentId}/guardians/${guardianId}`,
    { method: "DELETE" }
  );
}

/**
 * Creates a parent login for a guardian who has none. Answers 409 when the
 * address is already taken by another account — the guardian keeps no login in
 * that case, so the caller should offer a different address.
 */
export function createGuardianLogin(
  studentId: string | number,
  guardianId: string | number,
  input: { email: string; password: string }
): Promise<{ user_id: string | number }> {
  return authedFetch<{ user_id: string | number }>(
    `/api/v1/students/${studentId}/guardians/${guardianId}/create-login`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

/** Points a guardian at an account that already exists. */
export function linkGuardianUser(
  studentId: string | number,
  guardianId: string | number,
  userId: string | number
): Promise<{ linked: boolean }> {
  return authedFetch<{ linked: boolean }>(
    `/api/v1/students/${studentId}/guardians/${guardianId}/link-user`,
    { method: "POST", body: JSON.stringify({ user_id: userId }) }
  );
}

export function updateDocument(
  studentId: string | number,
  documentId: string | number,
  patch: Partial<NewDocument>
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(
    `/api/v1/students/${studentId}/documents/${documentId}`,
    { method: "PUT", body: JSON.stringify(patch) }
  );
}

export function deleteDocument(
  studentId: string | number,
  documentId: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(
    `/api/v1/students/${studentId}/documents/${documentId}`,
    { method: "DELETE" }
  );
}

/* -------------------------------------------------------------------------- */
/*                          Departments & designations                        */
/* -------------------------------------------------------------------------- */

export type Department = {
  id: string | number;
  name: string;
};

export type Designation = {
  id: string | number;
  title: string;
};

export function listDepartments(): Promise<Department[]> {
  return authedList<Department>("/api/v1/departments");
}

export function createDepartment(
  name: string
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/departments", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateDepartment(
  id: string | number,
  name: string
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/departments/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

/** Rejected with 409 while any staff member sits in the department. */
export function deleteDepartment(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/departments/${id}`, {
    method: "DELETE",
  });
}

export function listDesignations(): Promise<Designation[]> {
  return authedList<Designation>("/api/v1/designations");
}

export function createDesignation(
  title: string
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/designations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function updateDesignation(
  id: string | number,
  title: string
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/designations/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
}

/** Rejected with 409 while any staff member holds the designation. */
export function deleteDesignation(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/designations/${id}`, {
    method: "DELETE",
  });
}

/* -------------------------------------------------------------------------- */
/*                                    Staff                                   */
/* -------------------------------------------------------------------------- */

export type StaffMember = {
  id: string | number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  department_id?: string | number | null;
  designation_id?: string | number | null;
  is_active: boolean;
};

/** The full row `GET /api/v1/staff/:id` returns. */
export type StaffDetail = StaffMember & {
  gender?: string | null;
  date_of_birth?: string | null;
  join_date?: string | null;
};

export type StaffQuery = {
  page?: number;
  per_page?: number;
  /** Free text — the backend matches it against name, code and email. */
  search?: string;
  /** Empty string means "no filter". */
  department_id?: string | number | "";
};

export function listStaff({
  page = 1,
  per_page = 20,
  search = "",
  department_id = "",
}: StaffQuery = {}): Promise<Page<StaffMember>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });

  // Omitted rather than sent empty: a blank `search` would filter on "".
  const trimmed = search.trim();
  if (trimmed) params.set("search", trimmed);
  if (department_id !== "" && department_id != null) {
    params.set("department_id", String(department_id));
  }

  return authedFetchPage<StaffMember>(`/api/v1/staff?${params.toString()}`);
}

export function getStaffMember(id: string | number): Promise<StaffDetail> {
  return authedFetch<StaffDetail>(`/api/v1/staff/${id}`);
}

/** The create payload. Everything after `last_name` is optional. */
export type NewStaff = {
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  date_of_birth?: string;
  department_id?: string | number;
  designation_id?: string | number;
  join_date?: string;
};

export function createStaff(
  input: NewStaff
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/staff", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Every field the update endpoint accepts. Send only what changed. */
export type StaffPatch = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  date_of_birth?: string;
  department_id?: string | number;
  designation_id?: string | number;
  join_date?: string;
  is_active?: boolean;
};

export function updateStaff(
  id: string | number,
  patch: StaffPatch
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/staff/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

/** Soft-delete — the record stays, it just leaves the active roster. */
export function deleteStaff(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/staff/${id}`, {
    method: "DELETE",
  });
}

/** Attendance rows carry no id of their own — the date is the key. */
export type StaffAttendanceEntry = {
  date: string;
  status: string;
  remarks?: string | null;
};

export function listStaffAttendance(
  id: string | number
): Promise<StaffAttendanceEntry[]> {
  return authedList<StaffAttendanceEntry>(`/api/v1/staff/${id}/attendance`);
}

/* -------------------------------------------------------------------------- */
/*                                 Attendance                                 */
/* -------------------------------------------------------------------------- */

export const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "excused",
  "half_day",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Normalises a backend token (`HALF_DAY`, `Late`…) to a known status. */
export function toAttendanceStatus(
  value: string | null | undefined
): AttendanceStatus | null {
  const key = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (ATTENDANCE_STATUSES as readonly string[]).includes(key)
    ? (key as AttendanceStatus)
    : null;
}

/** A section's enrolled students, in the shape the roster screen needs. */
export type RosterEntry = {
  enrollment_id: string | number;
  roll_number?: string | number | null;
  student_id: string | number;
  first_name: string;
  last_name: string;
  admission_number: string;
};

export function listSectionRoster(
  sectionId: string | number
): Promise<RosterEntry[]> {
  return authedList<RosterEntry>(`/api/v1/sections/${sectionId}/enrollments`);
}

export type AttendanceRecord = {
  id: string | number;
  enrollment_id: string | number;
  student_id: string | number;
  date: string;
  status: string;
  remarks?: string | null;
};

export type AttendanceQuery = {
  section_id?: string | number | null;
  date_from?: string | null;
  date_to?: string | null;
  student_id?: string | number | null;
  status?: string | null;
};

export function listAttendance(
  query: AttendanceQuery = {}
): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }

  const suffix = params.toString();
  return authedList<AttendanceRecord>(
    `/api/v1/attendance${suffix ? `?${suffix}` : ""}`
  );
}

export type AttendanceMark = {
  enrollment_id: string | number;
  status: AttendanceStatus;
  remarks?: string;
};

/** Upsert: re-posting a date replaces what was marked for it. */
export function markAttendanceBulk(input: {
  section_id: string | number;
  date: string;
  records: AttendanceMark[];
}): Promise<{ marked: number; date: string }> {
  return authedFetch<{ marked: number; date: string }>(
    "/api/v1/attendance/bulk",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export type AttendanceSummaryRow = {
  student_id: string | number;
  total_days: number;
  present_days: number;
  present_pct: number;
};

export function getAttendanceSummary({
  section_id,
  month,
}: {
  section_id: string | number;
  /** `YYYY-MM`. */
  month: string;
}): Promise<AttendanceSummaryRow[]> {
  const params = new URLSearchParams({
    section_id: String(section_id),
    month,
  });

  return authedList<AttendanceSummaryRow>(
    `/api/v1/attendance/summary?${params.toString()}`
  );
}

/* -------------------------------------------------------------------------- */
/*                             Fees — setup tables                            */
/* -------------------------------------------------------------------------- */

export const FEE_FREQUENCIES = [
  "one_time",
  "monthly",
  "quarterly",
  "term",
  "annual",
] as const;

export type FeeFrequency = (typeof FEE_FREQUENCIES)[number];

export type FeeCategory = {
  id: string | number;
  name: string;
  frequency: string;
};

export function listFeeCategories(): Promise<FeeCategory[]> {
  return authedList<FeeCategory>("/api/v1/fee-categories");
}

export function createFeeCategory(input: {
  name: string;
  frequency: FeeFrequency;
}): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/fee-categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateFeeCategory(
  id: string | number,
  input: { name: string; frequency: FeeFrequency }
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/fee-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export type FeeStructure = {
  id: string | number;
  fee_category_id: string | number;
  category_name?: string | null;
  class_id: string | number;
  class_name?: string | null;
  academic_year_id: string | number;
  amount: number;
};

export function listFeeStructures(
  query: {
    class_id?: string | number | null;
    academic_year_id?: string | number | null;
  } = {}
): Promise<FeeStructure[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }

  const suffix = params.toString();
  return authedList<FeeStructure>(
    `/api/v1/fee-structures${suffix ? `?${suffix}` : ""}`
  );
}

export function createFeeStructure(input: {
  fee_category_id: string | number;
  class_id: string | number;
  academic_year_id: string | number;
  amount: number;
}): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/fee-structures", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateFeeStructure(
  id: string | number,
  input: { amount: number }
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/fee-structures/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteFeeStructure(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/fee-structures/${id}`, {
    method: "DELETE",
  });
}

export const FEE_DISCOUNT_TYPES = [
  "sibling",
  "merit",
  "need_based",
  "staff_ward",
  "other",
] as const;

export type FeeDiscountType = (typeof FEE_DISCOUNT_TYPES)[number];

export type FeeDiscount = {
  id: string | number;
  name: string;
  type: string;
  is_percentage: boolean;
  value: number;
};

export function listFeeDiscounts(): Promise<FeeDiscount[]> {
  return authedList<FeeDiscount>("/api/v1/fee-discounts");
}

export function createFeeDiscount(input: {
  name: string;
  type: FeeDiscountType;
  is_percentage: boolean;
  value: number;
}): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/fee-discounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* -------------------------------------------------------------------------- */
/*                          Fees — allocations & payments                     */
/* -------------------------------------------------------------------------- */

export const FEE_STATUSES = ["paid", "partial", "pending", "overdue"] as const;

export type FeeStatus = (typeof FEE_STATUSES)[number];

/** Normalises a backend token (`PARTIALLY_PAID`, `Overdue`…) to a known status. */
export function toFeeStatus(value: string | null | undefined): FeeStatus | null {
  const key = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((FEE_STATUSES as readonly string[]).includes(key)) return key as FeeStatus;
  // Tolerate longer spellings around the same four states.
  if (key.includes("overdue")) return "overdue";
  if (key.includes("partial")) return "partial";
  if (key.includes("paid")) return "paid";
  if (key.includes("pending") || key.includes("unpaid")) return "pending";
  return null;
}

export type FeeAllocation = {
  id: string | number;
  enrollment_id: string | number;
  fee_structure_id: string | number;
  discount_id?: string | number | null;
  amount_due: number;
  amount_paid: number;
  status: string;
  due_date?: string | null;
};

export function listFeeAllocations(
  query: {
    enrollment_id?: string | number | null;
    status?: string | null;
  } = {}
): Promise<Page<FeeAllocation>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }

  const suffix = params.toString();
  return authedFetchPage<FeeAllocation>(
    `/api/v1/fee-allocations${suffix ? `?${suffix}` : ""}`
  );
}

export function createFeeAllocation(input: {
  enrollment_id: string | number;
  fee_structure_id: string | number;
  discount_id?: string | number;
  due_date?: string;
}): Promise<{ id: string | number; amount_due: number }> {
  return authedFetch<{ id: string | number; amount_due: number }>(
    "/api/v1/fee-allocations",
    { method: "POST", body: JSON.stringify(input) }
  );
}

/** Bulk: allots every matching fee structure to every enrolled student. */
export function generateFeeAllocations(input: {
  academic_year_id: string | number;
  class_id?: string | number;
  due_date?: string;
}): Promise<{ allocations_created: number }> {
  return authedFetch<{ allocations_created: number }>(
    "/api/v1/fee-allocations/generate",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export const PAYMENT_MODES = [
  "cash",
  "cheque",
  "card",
  "upi",
  "bank_transfer",
  "online",
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export type Payment = {
  id: string | number;
  allocation_id?: string | number | null;
  amount: number;
  payment_mode: string;
  transaction_reference?: string | null;
  payment_date?: string | null;
  remarks?: string | null;
};

/** The updated allocation rides back on the response — no refetch needed. */
export type PaymentResult = {
  id: string | number;
  allocation: {
    amount_paid: number;
    amount_due: number;
    status: string;
  };
};

export function createPayment(input: {
  allocation_id: string | number;
  amount: number;
  payment_mode: PaymentMode;
  transaction_reference?: string;
  payment_date?: string;
  remarks?: string;
}): Promise<PaymentResult> {
  return authedFetch<PaymentResult>("/api/v1/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listPayments(allocationId: string | number): Promise<Payment[]> {
  return authedList<Payment>(
    `/api/v1/payments?allocation_id=${encodeURIComponent(String(allocationId))}`
  );
}

export function listStudentPayments(
  studentId: string | number
): Promise<Payment[]> {
  return authedList<Payment>(`/api/v1/students/${studentId}/payments`);
}

/* -------------------------------------------------------------------------- */
/*                        Exams — reference & structure                       */
/* -------------------------------------------------------------------------- */

export type Term = {
  id: string | number;
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export function listTerms(
  academicYearId: string | number
): Promise<Term[]> {
  return authedList<Term>(`/api/v1/academic-years/${academicYearId}/terms`);
}

export type NewAcademicTerm = {
  name: string;
  start_date: string;
  end_date: string;
};

export function createTerm(
  yearId: string | number,
  input: NewAcademicTerm
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>(
    `/api/v1/academic-years/${yearId}/terms`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export type AcademicTermPatch = Partial<NewAcademicTerm>;

export function updateTerm(
  yearId: string | number,
  termId: string | number,
  patch: AcademicTermPatch
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(
    `/api/v1/academic-years/${yearId}/terms/${termId}`,
    { method: "PUT", body: JSON.stringify(patch) }
  );
}

/** Rejected with 409 while any exam is scheduled inside the term. */
export function deleteTerm(
  yearId: string | number,
  termId: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(
    `/api/v1/academic-years/${yearId}/terms/${termId}`,
    { method: "DELETE" }
  );
}

export type Subject = {
  id: string | number;
  name: string;
  code?: string | null;
};

export function listSubjects(): Promise<Subject[]> {
  return authedList<Subject>("/api/v1/subjects");
}

export function createSubject(input: {
  name: string;
  code?: string;
}): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/subjects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type SubjectPatch = { name?: string; code?: string };

export function updateSubject(
  id: string | number,
  patch: SubjectPatch
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/subjects/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

/** Rejected with 409 while the subject is attached to an exam or a grade. */
export function deleteSubject(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/subjects/${id}`, {
    method: "DELETE",
  });
}

export type ExamType = {
  id: string | number;
  name: string;
};

export function listExamTypes(): Promise<ExamType[]> {
  return authedList<ExamType>("/api/v1/exam-types");
}

export function createExamType(name: string): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/exam-types", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateExamType(
  id: string | number,
  name: string
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/exam-types/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

/** Rejected with 409 while any exam still uses the type. */
export function deleteExamType(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/exam-types/${id}`, {
    method: "DELETE",
  });
}

export const GRADE_SCALE_TYPES = ["letter", "cgpa", "percentage"] as const;

export type GradeScaleType = (typeof GRADE_SCALE_TYPES)[number];

/**
 * The read and write shapes differ: `GET` returns `min`/`max`/`point`, while
 * `POST` takes `min_percent`/`max_percent`/`grade_point`. Both are accepted
 * here so a band renders whichever way the backend spells it.
 */
export type GradeScaleEntry = {
  grade: string;
  min?: number | null;
  max?: number | null;
  point?: number | null;
  min_percent?: number | null;
  max_percent?: number | null;
  grade_point?: number | null;
};

export type GradeScale = {
  id: string | number;
  name: string;
  type: string;
  entries?: GradeScaleEntry[] | null;
};

export function listGradeScales(): Promise<GradeScale[]> {
  return authedList<GradeScale>("/api/v1/grade-scales");
}

export function createGradeScale(input: {
  name: string;
  type: GradeScaleType;
  entries: {
    grade: string;
    min_percent: number;
    max_percent: number;
    grade_point: number;
  }[];
}): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/grade-scales", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* -------------------------------------------------------------------------- */
/*                                    Exams                                   */
/* -------------------------------------------------------------------------- */

export type Exam = {
  id: string | number;
  name: string;
  exam_type_id: string | number;
  academic_year_id: string | number;
  term_id?: string | number | null;
  start_date?: string | null;
  end_date?: string | null;
};

export function listExams(
  query: {
    academic_year_id?: string | number | null;
    term_id?: string | number | null;
  } = {}
): Promise<Exam[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }

  const suffix = params.toString();
  return authedList<Exam>(`/api/v1/exams${suffix ? `?${suffix}` : ""}`);
}

export function getExam(id: string | number): Promise<Exam> {
  return authedFetch<Exam>(`/api/v1/exams/${id}`);
}

export function createExam(input: {
  academic_year_id: string | number;
  term_id?: string | number;
  exam_type_id: string | number;
  name: string;
  start_date?: string;
  end_date?: string;
}): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/exams", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type ExamSubject = {
  id: string | number;
  subject_id: string | number;
  subject_name?: string | null;
  class_id?: string | number | null;
  exam_date?: string | null;
  max_marks: number;
  pass_marks?: number | null;
};

export function listExamSubjects(
  examId: string | number
): Promise<ExamSubject[]> {
  return authedList<ExamSubject>(`/api/v1/exams/${examId}/subjects`);
}

export function createExamSubject(
  examId: string | number,
  input: {
    subject_id: string | number;
    class_id?: string | number;
    exam_date?: string;
    max_marks: number;
    pass_marks?: number;
  }
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>(
    `/api/v1/exams/${examId}/subjects`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

/* -------------------------------------------------------------------------- */
/*                             Grades & report cards                          */
/* -------------------------------------------------------------------------- */

export type ExamGrade = {
  enrollment_id: string | number;
  marks_obtained?: number | null;
  grade?: string | null;
  remarks?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  admission_number?: string | null;
};

export function listExamGrades(
  examSubjectId: string | number
): Promise<ExamGrade[]> {
  return authedList<ExamGrade>(
    `/api/v1/exam-subjects/${examSubjectId}/grades`
  );
}

export type ExamGradeRecord = {
  enrollment_id: string | number;
  marks_obtained: number;
  grade?: string;
  remarks?: string;
};

/** Upsert: re-posting a subject replaces the marks recorded for it. */
export function saveExamGrades(
  examSubjectId: string | number,
  records: ExamGradeRecord[]
): Promise<{ graded: number }> {
  return authedFetch<{ graded: number }>(
    `/api/v1/exam-subjects/${examSubjectId}/grades`,
    { method: "POST", body: JSON.stringify({ records }) }
  );
}

export type ReportCard = {
  id: string | number;
  term_id?: string | number | null;
  total_marks?: number | null;
  percentage?: number | null;
  overall_grade?: string | null;
  rank?: number | null;
  generated_at?: string | null;
};

export function generateReportCard(input: {
  enrollment_id: string | number;
  term_id: string | number;
}): Promise<{ id: string | number; total_marks: number; percentage: number }> {
  return authedFetch<{
    id: string | number;
    total_marks: number;
    percentage: number;
  }>("/api/v1/report-cards/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listReportCards(
  enrollmentId: string | number
): Promise<ReportCard[]> {
  return authedList<ReportCard>(`/api/v1/report-cards/${enrollmentId}`);
}

/* -------------------------------------------------------------------------- */
/*                                  Calendar                                  */
/* -------------------------------------------------------------------------- */

export const CALENDAR_EVENT_TYPES = [
  "academic",
  "cultural",
  "sports",
  "examination",
  "holiday",
  "administrative",
  "other",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

/** Normalises a backend token (`SPORTS`, `Half-Day`…) to a known event type. */
export function toCalendarEventType(
  value: string | null | undefined
): CalendarEventType | null {
  const key = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (CALENDAR_EVENT_TYPES as readonly string[]).includes(key)
    ? (key as CalendarEventType)
    : null;
}

export type CalendarEvent = {
  id: string | number;
  title: string;
  description?: string | null;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  is_all_day?: boolean;
  location?: string | null;
};

export type CalendarEventInput = {
  academic_year_id: string | number;
  title: string;
  description?: string;
  event_type: CalendarEventType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  location?: string;
};

export function listCalendarEvents(
  query: {
    academic_year_id?: string | number | null;
    from?: string | null;
    to?: string | null;
    event_type?: string | null;
  } = {}
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }

  const suffix = params.toString();
  return authedList<CalendarEvent>(
    `/api/v1/calendar/events${suffix ? `?${suffix}` : ""}`
  );
}

export function createCalendarEvent(
  input: CalendarEventInput
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/calendar/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCalendarEvent(
  id: string | number,
  patch: Partial<Omit<CalendarEventInput, "academic_year_id">>
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/calendar/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteCalendarEvent(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/calendar/events/${id}`, {
    method: "DELETE",
  });
}

export const HOLIDAY_TYPES = [
  "national",
  "regional",
  "religious",
  "school",
  "weather",
  "emergency",
] as const;

export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export function toHolidayType(
  value: string | null | undefined
): HolidayType | null {
  const key = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (HOLIDAY_TYPES as readonly string[]).includes(key)
    ? (key as HolidayType)
    : null;
}

export type Holiday = {
  id: string | number;
  name: string;
  description?: string | null;
  holiday_type: string;
  start_date: string;
  end_date: string;
  is_recurring?: boolean;
};

export type HolidayInput = {
  academic_year_id: string | number;
  name: string;
  description?: string;
  holiday_type: HolidayType;
  start_date: string;
  end_date: string;
  is_recurring?: boolean;
};

export function listHolidays(
  academicYearId: string | number
): Promise<Holiday[]> {
  return authedList<Holiday>(
    `/api/v1/calendar/holidays?academic_year_id=${encodeURIComponent(
      String(academicYearId)
    )}`
  );
}

export function createHoliday(
  input: HolidayInput
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/calendar/holidays", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteHoliday(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/calendar/holidays/${id}`, {
    method: "DELETE",
  });
}

/**
 * `working_days` has no documented shape, so both a list and a delimited
 * string are accepted. Whatever came back is written back in the same shape.
 */
export type CalendarConfig = {
  working_days?: string[] | string | null;
  school_start_time?: string | null;
  school_end_time?: string | null;
  half_day_end_time?: string | null;
  total_working_days?: number | null;
};

export function getCalendarConfig(
  academicYearId: string | number
): Promise<CalendarConfig | null> {
  return authedFetch<CalendarConfig | null>(
    `/api/v1/calendar/config/${academicYearId}`
  );
}

export function updateCalendarConfig(
  academicYearId: string | number,
  patch: CalendarConfig
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(
    `/api/v1/calendar/config/${academicYearId}`,
    { method: "PUT", body: JSON.stringify(patch) }
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Users                                   */
/* -------------------------------------------------------------------------- */

export const USER_ROLES = [
  "super_admin",
  "admin",
  "principal",
  "teacher",
  "accountant",
  "clerk",
  "parent",
  "student",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Normalises a backend token (`SUPER_ADMIN`, `Teacher`…) to a known role. */
export function toUserRole(value: string | null | undefined): UserRole | null {
  const key = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (USER_ROLES as readonly string[]).includes(key)
    ? (key as UserRole)
    : null;
}

export const USER_STATUSES = ["active", "disabled"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export function toUserStatus(
  value: string | null | undefined
): UserStatus | null {
  const key = (value ?? "").trim().toLowerCase();
  if (key === "active" || key === "enabled") return "active";
  if (key === "disabled" || key === "inactive") return "disabled";
  return null;
}

/** A row from the user-management endpoints — not the signed-in `AuthUser`. */
export type ManagedUser = {
  id: string | number;
  email: string;
  role: string;
  full_name: string;
  phone?: string | null;
  status: string;
  linked_entity_id?: string | number | null;
  linked_entity_type?: string | null;
  created_at?: string | null;
};

export type UserQuery = {
  page?: number;
  per_page?: number;
  /** Free text — the backend matches it against name and email. */
  search?: string;
  /** Empty string means "no filter". */
  role?: UserRole | "";
  status?: UserStatus | "";
};

export function listUsers({
  page = 1,
  per_page = 20,
  search = "",
  role = "",
  status = "",
}: UserQuery = {}): Promise<Page<ManagedUser>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });

  // Omitted rather than sent empty: a blank `search` would filter on "".
  const trimmed = search.trim();
  if (trimmed) params.set("search", trimmed);
  if (role) params.set("role", role);
  if (status) params.set("status", status);

  return authedFetchPage<ManagedUser>(`/api/v1/users?${params.toString()}`);
}

export function getManagedUser(id: string | number): Promise<ManagedUser> {
  return authedFetch<ManagedUser>(`/api/v1/users/${id}`);
}

export type NewUser = {
  email: string;
  password: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  linked_entity_id?: string | number;
  linked_entity_type?: string;
};

export function createUser(input: NewUser): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type UserPatch = {
  full_name?: string;
  phone?: string;
  role?: UserRole;
  linked_entity_id?: string | number | null;
  linked_entity_type?: string | null;
};

export function updateUser(
  id: string | number,
  patch: UserPatch
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function updateUserPassword(
  id: string | number,
  password: string
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/users/${id}/password`, {
    method: "PUT",
    body: JSON.stringify({ password }),
  });
}

export function updateUserStatus(
  id: string | number,
  status: UserStatus
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/users/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/** Disables the account rather than erasing it. */
export function deleteUser(
  id: string | number
): Promise<{ deleted: boolean }> {
  return authedFetch<{ deleted: boolean }>(`/api/v1/users/${id}`, {
    method: "DELETE",
  });
}

/* -------------------------------------------------------------------------- */
/*                                  Settings                                  */
/* -------------------------------------------------------------------------- */

/** `value` is arbitrary JSON — a string, number, boolean or object. */
export type SettingEntry = {
  key: string;
  value: unknown;
  updated_at?: string | null;
};

export function listSettings(): Promise<SettingEntry[]> {
  return authedList<SettingEntry>("/api/v1/settings");
}

export function getSetting(key: string): Promise<SettingEntry> {
  return authedFetch<SettingEntry>(
    `/api/v1/settings/${encodeURIComponent(key)}`
  );
}

export function updateSetting(
  key: string,
  value: unknown
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(
    `/api/v1/settings/${encodeURIComponent(key)}`,
    { method: "PUT", body: JSON.stringify({ value }) }
  );
}

/* -------------------------------------------------------------------------- */
/*                              Leave management                              */
/* -------------------------------------------------------------------------- */

export type LeaveType = {
  id: string | number;
  name: string;
  /** Some backends cap an allowance per year; shown as a hint when present. */
  max_days_per_year?: number | null;
};

export function listLeaveTypes(): Promise<LeaveType[]> {
  return authedList<LeaveType>("/api/v1/leave-types");
}

export const LEAVE_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

/** Normalises a backend token (`PENDING`, `Cancelled`…) to a known status. */
export function toLeaveStatus(
  value: string | null | undefined
): LeaveStatus | null {
  const key = (value ?? "").trim().toLowerCase().replace(/[s-]+/g, "_");
  const alias = key === "canceled" ? "cancelled" : key;
  return (LEAVE_STATUSES as readonly string[]).includes(alias)
    ? (alias as LeaveStatus)
    : null;
}

export type LeaveRequest = {
  id: string | number;
  leave_type_id?: string | number | null;
  leave_type_name?: string | null;
  staff_id?: string | number | null;
  staff_name?: string | null;
  start_date: string;
  end_date: string;
  reason?: string | null;
  /** Free text — the backend's casing varies, so normalise before comparing. */
  status: string;
  applied_on?: string | null;
  created_at?: string | null;
};

export type LeaveQuery = {
  status?: LeaveStatus | "";
  staff_id?: string | number | "";
  /**
   * Forces the caller's own requests, whatever their role. An approver's
   * unscoped list is the whole school, so their "My Leave" screen has to ask
   * for `mine` explicitly — there is no staff id on the client to filter by.
   */
  scope?: "mine" | "";
};

/**
 * Leave requests, scoped by the backend to who is asking: staff see their own,
 * while an approver — principal and above — sees the whole school's. Callers
 * pass no scope of their own; the token decides it.
 */
export function listLeaves(query: LeaveQuery = {}): Promise<LeaveRequest[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }

  const suffix = params.toString();
  return authedList<LeaveRequest>(
    `/api/v1/leaves${suffix ? `?${suffix}` : ""}`
  );
}

export type NewLeaveRequest = {
  leave_type_id: string | number;
  start_date: string;
  end_date: string;
  reason: string;
};

export function createLeave(
  input: NewLeaveRequest
): Promise<{ id: string | number }> {
  return authedFetch<{ id: string | number }>("/api/v1/leaves", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Withdraws a request of your own that has not been decided yet. */
export function cancelLeave(
  id: string | number
): Promise<{ updated: boolean }> {
  return authedFetch<{ updated: boolean }>(`/api/v1/leaves/${id}/cancel`, {
    method: "PUT",
  });
}

/** The two outcomes an approver can record. */
export type LeaveDecision = Extract<LeaveStatus, "approved" | "rejected">;

/**
 * Approves or rejects someone else's pending request. A request that has
 * already been decided is refused with 409, and the message names the status
 * it is in — worth surfacing verbatim.
 */
export function decideLeave(
  id: string | number,
  status: LeaveDecision,
  remarks?: string
): Promise<{ updated: boolean }> {
  const trimmed = remarks?.trim();
  return authedFetch<{ updated: boolean }>(`/api/v1/leaves/${id}`, {
    method: "PATCH",
    body: JSON.stringify(trimmed ? { status, remarks: trimmed } : { status }),
  });
}
