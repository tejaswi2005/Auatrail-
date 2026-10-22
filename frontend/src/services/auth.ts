export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "DRIVER" | "CUSTOMER";
}

export function getAccessToken() {
  return sessionStorage.getItem("aquatrail_access_token");
}

// export function saveSession(token: string, user: AuthUser) {
//   sessionStorage.setItem("aquatrail_access_token", token);
//   sessionStorage.setItem("aquatrail_user", JSON.stringify(user));
// }

export function saveSession(
  token: string,
  user: AuthUser
): void {
  sessionStorage.setItem("aquatrail_access_token", token);

  sessionStorage.setItem(
    "aquatrail_user",
    JSON.stringify(user)
  );
}

export function clearSession() {
  sessionStorage.removeItem("aquatrail_access_token");
  sessionStorage.removeItem("aquatrail_user");
}

export function getSessionUser(): AuthUser | null {
  const raw = sessionStorage.getItem("aquatrail_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}