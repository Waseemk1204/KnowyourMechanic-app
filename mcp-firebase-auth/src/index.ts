#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getAuth, UserRecord } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load service account from the api directory (relative to project root)
const serviceAccountPath = resolve(__dirname, "../../api/serviceAccountKey.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8")) as ServiceAccount;

// Initialize Firebase Admin
initializeApp({
    credential: cert(serviceAccount),
});

const auth = getAuth();

// Create MCP Server
const server = new Server(
    {
        name: "firebase-auth-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_users",
                description: "List all Firebase Auth users with pagination",
                inputSchema: {
                    type: "object",
                    properties: {
                        maxResults: {
                            type: "number",
                            description: "Maximum number of users to return (default: 100, max: 1000)",
                        },
                        pageToken: {
                            type: "string",
                            description: "Page token for pagination",
                        },
                    },
                },
            },
            {
                name: "get_user",
                description: "Get a user by UID or email",
                inputSchema: {
                    type: "object",
                    properties: {
                        uid: {
                            type: "string",
                            description: "User UID",
                        },
                        email: {
                            type: "string",
                            description: "User email address",
                        },
                    },
                },
            },
            {
                name: "create_user",
                description: "Create a new Firebase Auth user",
                inputSchema: {
                    type: "object",
                    properties: {
                        email: {
                            type: "string",
                            description: "User email address",
                        },
                        password: {
                            type: "string",
                            description: "User password (min 6 characters)",
                        },
                        displayName: {
                            type: "string",
                            description: "User display name",
                        },
                        phoneNumber: {
                            type: "string",
                            description: "User phone number (E.164 format)",
                        },
                        disabled: {
                            type: "boolean",
                            description: "Whether the user is disabled",
                        },
                    },
                    required: ["email", "password"],
                },
            },
            {
                name: "update_user",
                description: "Update an existing Firebase Auth user",
                inputSchema: {
                    type: "object",
                    properties: {
                        uid: {
                            type: "string",
                            description: "User UID (required)",
                        },
                        email: {
                            type: "string",
                            description: "New email address",
                        },
                        password: {
                            type: "string",
                            description: "New password",
                        },
                        displayName: {
                            type: "string",
                            description: "New display name",
                        },
                        phoneNumber: {
                            type: "string",
                            description: "New phone number (E.164 format)",
                        },
                        disabled: {
                            type: "boolean",
                            description: "Whether the user is disabled",
                        },
                    },
                    required: ["uid"],
                },
            },
            {
                name: "delete_user",
                description: "Delete a Firebase Auth user",
                inputSchema: {
                    type: "object",
                    properties: {
                        uid: {
                            type: "string",
                            description: "User UID to delete",
                        },
                    },
                    required: ["uid"],
                },
            },
            {
                name: "disable_user",
                description: "Enable or disable a Firebase Auth user",
                inputSchema: {
                    type: "object",
                    properties: {
                        uid: {
                            type: "string",
                            description: "User UID",
                        },
                        disabled: {
                            type: "boolean",
                            description: "Set to true to disable, false to enable",
                        },
                    },
                    required: ["uid", "disabled"],
                },
            },
        ],
    };
});

// Format user for output
function formatUser(user: UserRecord): object {
    return {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        disabled: user.disabled,
        metadata: {
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime,
        },
    };
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "list_users": {
                const maxResults = (args?.maxResults as number) || 100;
                const pageToken = args?.pageToken as string | undefined;

                const listResult = await auth.listUsers(maxResults, pageToken);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                users: listResult.users.map(formatUser),
                                pageToken: listResult.pageToken,
                                totalUsers: listResult.users.length,
                            }, null, 2),
                        },
                    ],
                };
            }

            case "get_user": {
                let user: UserRecord;

                if (args?.uid) {
                    user = await auth.getUser(args.uid as string);
                } else if (args?.email) {
                    user = await auth.getUserByEmail(args.email as string);
                } else {
                    throw new Error("Either uid or email must be provided");
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(formatUser(user), null, 2),
                        },
                    ],
                };
            }

            case "create_user": {
                const user = await auth.createUser({
                    email: args?.email as string,
                    password: args?.password as string,
                    displayName: args?.displayName as string | undefined,
                    phoneNumber: args?.phoneNumber as string | undefined,
                    disabled: args?.disabled as boolean | undefined,
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: "User created successfully",
                                user: formatUser(user),
                            }, null, 2),
                        },
                    ],
                };
            }

            case "update_user": {
                const uid = args?.uid as string;
                const updateData: {
                    email?: string;
                    password?: string;
                    displayName?: string;
                    phoneNumber?: string;
                    disabled?: boolean;
                } = {};

                if (args?.email) updateData.email = args.email as string;
                if (args?.password) updateData.password = args.password as string;
                if (args?.displayName) updateData.displayName = args.displayName as string;
                if (args?.phoneNumber) updateData.phoneNumber = args.phoneNumber as string;
                if (typeof args?.disabled === "boolean") updateData.disabled = args.disabled;

                const user = await auth.updateUser(uid, updateData);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: "User updated successfully",
                                user: formatUser(user),
                            }, null, 2),
                        },
                    ],
                };
            }

            case "delete_user": {
                const uid = args?.uid as string;
                await auth.deleteUser(uid);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: `User ${uid} deleted successfully`,
                            }, null, 2),
                        },
                    ],
                };
            }

            case "disable_user": {
                const uid = args?.uid as string;
                const disabled = args?.disabled as boolean;

                const user = await auth.updateUser(uid, { disabled });

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: `User ${uid} ${disabled ? "disabled" : "enabled"} successfully`,
                                user: formatUser(user),
                            }, null, 2),
                        },
                    ],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ error: errorMessage }, null, 2),
                },
            ],
            isError: true,
        };
    }
});

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Firebase Auth MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
