"""Read-only service integrations. Each token is sent to one fixed HTTPS endpoint."""
from dataclasses import dataclass

import requests


@dataclass(frozen=True)
class Service:
    name: str
    category: str
    endpoint: str
    description: str
    header: str = "Authorization"
    prefix: str = "Bearer "

    def read(self, token: str):
        response = requests.get(
            self.endpoint, headers={self.header: self.prefix + token, "Accept": "application/json"},
            timeout=12, allow_redirects=False,
        )
        if not 200 <= response.status_code < 300:
            raise ValueError(f"{self.name} returned HTTP {response.status_code}. Check token permissions.")
        return response.json()


class LinearService(Service):
    def read(self, token: str):
        response = requests.post(
            self.endpoint, headers={"Authorization": token},
            json={"query": "{ viewer { assignedIssues(first: 10) { nodes { identifier title url } } } }"},
            timeout=12, allow_redirects=False,
        )
        if response.status_code != 200 or response.json().get("errors"):
            raise ValueError("Linear could not read assigned issues. Check your personal API key.")
        return response.json()["data"]["viewer"]["assignedIssues"]["nodes"]


DEV = "developer"
WORK = "workspace"
COMM = "communication"
OPS = "operations"
SERVICES = {
    "linear": LinearService("Linear", DEV, "https://api.linear.app/graphql", "List up to ten issues assigned to you with their titles and links.", "Authorization", ""),
    "figma": Service("Figma", WORK, "https://api.figma.com/v1/me", "Read the profile associated with your Figma personal access token.", "X-Figma-Token", ""),
    "vercel": Service("Vercel", DEV, "https://api.vercel.com/v6/deployments?limit=10", "List recent deployments and inspect their URLs and build states."),
    "gitlab": Service("GitLab", DEV, "https://gitlab.com/api/v4/projects?membership=true&per_page=10", "Find projects you belong to and open their repository links.", "PRIVATE-TOKEN", ""),
    "supabase": Service("Supabase", DEV, "https://api.supabase.com/v1/projects", "List your projects and check their regions and operational status."),
    "netlify": Service("Netlify", DEV, "https://api.netlify.com/api/v1/sites?per_page=10", "List sites in your account and find their published URLs."),
    "render": Service("Render", DEV, "https://api.render.com/v1/services?limit=10", "Inspect your services, their types, and deployment settings."),
    "cloudflare": Service("Cloudflare", DEV, "https://api.cloudflare.com/client/v4/zones?per_page=10", "List zones and check which domains are active in your account."),
    "sentry": Service("Sentry", DEV, "https://sentry.io/api/0/organizations/", "Find the organizations accessible to your token and their slugs."),
    "huggingface": Service("Hugging Face", DEV, "https://huggingface.co/api/whoami-v2", "Check your account identity and organization memberships."),
    "postman": Service("Postman", DEV, "https://api.getpostman.com/workspaces", "Find your API workspaces and read their names and IDs.", "X-Api-Key", ""),
    "digitalocean": Service("DigitalOcean", DEV, "https://api.digitalocean.com/v2/droplets?per_page=10", "List droplets and check their regions, sizes, and status."),
    "fly": Service("Fly.io", DEV, "https://api.machines.dev/v1/orgs", "Find organizations available to your Fly.io account."),
    "bitbucket": Service("Bitbucket", DEV, "https://api.bitbucket.org/2.0/repositories?role=member&pagelen=10", "Find repositories you belong to and open their source links."),
    "circleci": Service("CircleCI", DEV, "https://circleci.com/api/v2/me", "Check which CircleCI account your token authenticates.", "Circle-Token", ""),
    "google_calendar": Service("Google Calendar", WORK, "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10", "Find your calendars and check your access role for each."),
    "google_tasks": Service("Google Tasks", WORK, "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=10", "List task lists and see when they were last updated."),
    "ms_teams": Service("Microsoft Teams", COMM, "https://graph.microsoft.com/v1.0/me/joinedTeams", "Find teams you have joined and read their descriptions."),
    "onedrive": Service("OneDrive", WORK, "https://graph.microsoft.com/v1.0/me/drive/root/children?$top=10", "Browse files and folders at the root of your OneDrive."),
    "outlook": Service("Outlook", COMM, "https://graph.microsoft.com/v1.0/me/events?$top=10&$select=subject,start,end", "Read event subjects and start and end times from your calendar."),
    "zoom": Service("Zoom", COMM, "https://api.zoom.us/v2/users/me/meetings?page_size=10", "List your meetings and review topics and scheduled times."),
    "asana": Service("Asana", WORK, "https://app.asana.com/api/1.0/workspaces?limit=10", "Find workspaces available to your Asana account."),
    "clickup": Service("ClickUp", WORK, "https://api.clickup.com/api/v2/team", "List the ClickUp workspaces accessible with your token.", "Authorization", ""),
    "airtable": Service("Airtable", OPS, "https://api.airtable.com/v0/meta/bases", "Find bases by name and check your permission level."),
    "hubspot": Service("HubSpot", OPS, "https://api.hubapi.com/crm/v3/objects/companies?limit=10", "List CRM company records and inspect their properties."),
    "stripe": Service("Stripe", OPS, "https://api.stripe.com/v1/products?limit=10", "Browse products and check product names and active status."),
    "brevo": Service("Brevo", OPS, "https://api.brevo.com/v3/contacts/lists?limit=10", "List contact lists and inspect their subscriber counts.", "api-key", ""),
    "mailerlite": Service("MailerLite", OPS, "https://connect.mailerlite.com/api/groups?limit=10", "Find subscriber groups and review their membership counts."),
}
