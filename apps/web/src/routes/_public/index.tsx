import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/modules/home";

export const Route = createFileRoute("/_public/")({ component: HomePage });
