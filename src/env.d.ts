/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        user?: {
            id: number
            email: string
        }
    }
}

interface ImportMetaEnv {
    readonly DATABASE_URL: string;
    readonly JWT_SECRET: string;
    readonly ADMIN_EMAIL: string;
    readonly ADMIN_PASSWORD: string;
}