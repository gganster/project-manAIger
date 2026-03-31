import crypto from "node:crypto"

const GITHUB_API = "https://api.github.com"

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description || data.error)
  return data.access_token
}

export async function getGitHubUser(token: string): Promise<{ id: number; login: string }> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  })
  if (!res.ok) throw new Error("Failed to fetch GitHub user")
  const data = await res.json()
  return { id: data.id, login: data.login }
}

export interface GitHubRepo {
  owner: string
  name: string
  fullName: string
  private: boolean
}

export async function listUserRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = []
  let page = 1
  while (true) {
    const res = await fetch(`${GITHUB_API}/user/repos?per_page=100&page=${page}&sort=updated`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    })
    if (!res.ok) throw new Error("Failed to list repos")
    const data = await res.json()
    if (data.length === 0) break
    for (const r of data) {
      repos.push({ owner: r.owner.login, name: r.name, fullName: r.full_name, private: r.private })
    }
    if (data.length < 100) break
    page++
  }
  return repos
}

export async function createRepoWebhook(
  token: string,
  owner: string,
  repo: string,
  webhookUrl: string,
  secret: string
): Promise<number> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/hooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["create", "push"],
      config: { url: webhookUrl, content_type: "json", secret, insecure_ssl: "0" },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error("[createRepoWebhook] GitHub API error:", res.status, JSON.stringify(err))
    throw new Error(err.message || "Failed to create webhook")
  }
  const data = await res.json()
  return data.id
}

export async function deleteRepoWebhook(
  token: string,
  owner: string,
  repo: string,
  hookId: number
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/hooks/${hookId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  })
  if (!res.ok && res.status !== 404) throw new Error("Failed to delete webhook")
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex")
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export function signState(data: object, secret: string): string {
  const json = JSON.stringify(data)
  const b64 = Buffer.from(json).toString("base64url")
  const sig = crypto.createHmac("sha256", secret).update(b64).digest("hex")
  return `${b64}.${sig}`
}

export function verifyState(state: string, secret: string): object | null {
  const [b64, sig] = state.split(".")
  if (!b64 || !sig) return null
  const expected = crypto.createHmac("sha256", secret).update(b64).digest("hex")
  if (expected.length !== sig.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null
  return JSON.parse(Buffer.from(b64, "base64url").toString())
}
