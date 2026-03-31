import { createFileRoute } from "@tanstack/react-router"
import { exchangeCodeForToken, getGitHubUser, verifyState } from "@/lib/github"
import getAdmin from "@/firebase-admin"

export const Route = createFileRoute("/api/github/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get("code")
        const stateParam = url.searchParams.get("state")

        if (!code || !stateParam) {
          return new Response("Missing code or state", { status: 400 })
        }

        const stateData = verifyState(stateParam, process.env.GITHUB_CLIENT_SECRET!) as {
          uid: string
          projectId: string
        } | null

        if (!stateData) {
          return new Response("Invalid state", { status: 403 })
        }

        const { uid, projectId } = stateData

        const accessToken = await exchangeCodeForToken(code)
        const ghUser = await getGitHubUser(accessToken)

        const admin = getAdmin()
        await admin.firestore().collection("users").doc(uid).update({
          github: {
            id: ghUser.id,
            login: ghUser.login,
            accessToken,
            connectedAt: new Date(),
          },
        })

        return new Response(null, {
          status: 302,
          headers: {
            Location: `${url.origin}/projects/${projectId}/settings?github=connected`,
          },
        })
      },
    },
  },
})
