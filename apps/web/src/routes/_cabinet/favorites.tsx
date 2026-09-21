import { createFileRoute } from "@tanstack/react-router";

import { FavoritesPage } from "@/modules/account";

export const Route = createFileRoute("/_cabinet/favorites")({ component: FavoritesPage });
