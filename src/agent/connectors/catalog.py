"""Read-only service integrations. Each token is sent to one fixed HTTPS endpoint."""
from dataclasses import dataclass

import requests


@dataclass(frozen=True)
class Service:
    name: str
    category: str
    resource: str
    endpoint: str
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


DEV = "developer"
WORK = "workspace"
OPS = "operations"
SERVICES = {
    "vercel": Service("Vercel", DEV, "recent deployments", "https://api.vercel.com/v6/deployments?limit=10"),
    "gitlab": Service("GitLab", DEV, "membership projects", "https://gitlab.com/api/v4/projects?membership=true&per_page=10", "PRIVATE-TOKEN", ""),
    "supabase": Service("Supabase", DEV, "projects", "https://api.supabase.com/v1/projects"),
    "netlify": Service("Netlify", DEV, "sites", "https://api.netlify.com/api/v1/sites?per_page=10"),
    "render": Service("Render", DEV, "services", "https://api.render.com/v1/services?limit=10"),
    "cloudflare": Service("Cloudflare", DEV, "zones", "https://api.cloudflare.com/client/v4/zones?per_page=10"),
    "sentry": Service("Sentry", DEV, "organizations", "https://sentry.io/api/0/organizations/"),
    "huggingface": Service("Hugging Face", DEV, "account details", "https://huggingface.co/api/whoami-v2"),
    "postman": Service("Postman", DEV, "workspaces", "https://api.getpostman.com/workspaces", "X-Api-Key", ""),
    "digitalocean": Service("DigitalOcean", DEV, "droplets", "https://api.digitalocean.com/v2/droplets?per_page=10"),
    "fly": Service("Fly.io", DEV, "organizations", "https://api.machines.dev/v1/orgs"),
    "bitbucket": Service("Bitbucket", DEV, "repositories", "https://api.bitbucket.org/2.0/repositories?role=member&pagelen=10"),
    "circleci": Service("CircleCI", DEV, "account details", "https://circleci.com/api/v2/me", "Circle-Token", ""),
    "google_calendar": Service("Google Calendar", WORK, "calendars", "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10"),
    "google_tasks": Service("Google Tasks", WORK, "task lists", "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=10"),
    "ms_teams": Service("Microsoft Teams", WORK, "joined teams", "https://graph.microsoft.com/v1.0/me/joinedTeams"),
    "onedrive": Service("OneDrive", WORK, "root files", "https://graph.microsoft.com/v1.0/me/drive/root/children?$top=10"),
    "outlook": Service("Outlook", WORK, "calendar events", "https://graph.microsoft.com/v1.0/me/events?$top=10&$select=subject,start,end"),
    "zoom": Service("Zoom", WORK, "meetings", "https://api.zoom.us/v2/users/me/meetings?page_size=10"),
    "asana": Service("Asana", WORK, "workspaces", "https://app.asana.com/api/1.0/workspaces?limit=10"),
    "clickup": Service("ClickUp", WORK, "workspaces", "https://api.clickup.com/api/v2/team", "Authorization", ""),
    "airtable": Service("Airtable", OPS, "bases", "https://api.airtable.com/v0/meta/bases"),
    "hubspot": Service("HubSpot", OPS, "companies", "https://api.hubapi.com/crm/v3/objects/companies?limit=10"),
    "stripe": Service("Stripe", OPS, "products", "https://api.stripe.com/v1/products?limit=10"),
    "brevo": Service("Brevo", OPS, "contact lists", "https://api.brevo.com/v3/contacts/lists?limit=10", "api-key", ""),
    "mailerlite": Service("MailerLite", OPS, "groups", "https://connect.mailerlite.com/api/groups?limit=10"),
}
