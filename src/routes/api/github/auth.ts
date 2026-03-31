import { createFileRoute } from "@tanstack/react-router"
import { signState } from "@/lib/github"

export const Route = createFileRoute("/api/github/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const uid = url.searchParams.get("uid")
        const projectId = url.searchParams.get("projectId")

        if (!uid || !projectId) {
          return new Response("Missing uid or projectId", { status: 400 })
        }

        const state = signState({ uid, projectId }, process.env.GITHUB_CLIENT_SECRET!)

        const params = new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID!,
          redirect_uri: `${url.origin}/api/github/callback`,
          scope: "repo read:user admin:repo_hook",
          state,
        })

        return new Response(null, {
          status: 302,
          headers: { Location: `https://github.com/login/oauth/authorize?${params}` },
        })
      },
    },
  },
})
