// This script provides a cleaner, runnable client for the application API.
// Prerequisites: node.js, axios, and ws.
// Install with: npm install axios ws

const axios = require("axios");
const WebSocket = require("ws");
const readline = require('readline');

// --- Configuration ---
const PORT= 8000;

// for prod,
// PORT= 9001;

const BASE_URL = "http://127.0.0.1:" + PORT; 
const APPLICATION_BASE_PATH = "/applications"; 
// Get auth token from environment variable
const AUTH_TOKEN = process.env.AUTH_TOKEN_BACKEND; 

// !!! CHANGE ME !!! 
// Replace with a valid scheme slug that has an "Online" process.
// const SCHEME_SLUG_TO_TEST = "csss-cus"; 
const SCHEME_SLUG_TO_TEST = "inspire-ff"; 
const CONTINUE_APPLICATION= "68dd1e98badd8541c5693aa5"
// ---------------------

if (!AUTH_TOKEN) {
    console.error("❌ FATAL: AUTH_TOKEN_BACKEND environment variable is not set. Please set it to a valid JWT.");
    process.exit(1);
}

const AXIOS_CONFIG = {
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    "Content-Type": "application/json",
  },
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Executes an HTTP request and handles common error logging.
 * @param {string} method - 'post' or 'get'.
 * @param {string} url - The full API URL.
 * @param {object} [payload={}] - The request body (only used for POST).
 * @returns {Promise<object|null>} The response data or null on failure.
 */
async function request(method, url, payload = {}) {
    try {
        let response;
        if (method === 'post') {
            response = await axios.post(url, payload, AXIOS_CONFIG);
        } else if (method === 'get') {
            response = await axios.get(url, AXIOS_CONFIG);
        } else {
            throw new Error(`Unsupported method: ${method}`);
        }
        return response.data;
    } catch (error) {
        const message = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.error(`\n❌ Error calling ${url} (${method.toUpperCase()}):`, message);
        return null;
    }
}

// 1. Function to list all applications (still POST based on original route)
async function listApplications() {
    console.log("--- 1. Listing Applications ---");
    const url = `${BASE_URL}${APPLICATION_BASE_PATH}/`;
    const data = await request('post', url);
    if (data && data.status === 1) {
        console.log("✅ Applications Fetched:");
        console.log(JSON.stringify(data, null, 2));
    }
    return data;
}

async function startApplication(schemeSlug) {
    console.log(`\n--- Starting Application for: ${schemeSlug} ---`);
    const url = `${BASE_URL}${APPLICATION_BASE_PATH}/start`;
    const payload = { scheme_slug: schemeSlug };
    const data = await request('post', url, payload);

    if (data && data.status === 1 && data.data && data.data.application_id) {
        console.log(`✅ New Application ID: ${data.data.application_id}`);
        return data.data.application_id;
    }
    return null;
}

// 2. Function to submit the completed application
async function submitApplication(applicationId) {
    console.log(`\n--- 2. Submitting Application: ${applicationId} (Using GET) ---`);
    // Route: GET /applications/{app_id}/submit
    const url = `${BASE_URL}${APPLICATION_BASE_PATH}/${applicationId}/submit`;
    const data = await request('get', url); 

    if (data && data.status === 1) {
        console.log("✅ Application submitted successfully.");
        console.log(JSON.stringify(data, null, 2));
        return true;
    }
    return false;
}

// 4. Function to connect to the WebSocket for live updates and interaction
function connectToWebSocket(applicationId, token) {
    console.log(`\n--- 4. Connecting to WebSocket for Application ${applicationId} ---`);
    
    // Route: ws://.../applications/ws/{application_id}?token=...
    const wsUrl = `${BASE_URL.replace("http", "ws")}${APPLICATION_BASE_PATH}/ws/${applicationId}?token=${token}`;
    console.log(`Establishing connection to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    let agentFinished = false;

    // Use a Promise to manage the asynchronous nature of the WebSocket connection
    return new Promise(resolve => {
        ws.on("open", () => {
            console.log("🌐 WebSocket connection established. Waiting for agent...");
        });

        ws.on("message", (data) => {
            try {
                const message = JSON.parse(data);
                console.log("\n<<< RECEIVED MESSAGE FROM AGENT >>>");
                console.log(JSON.stringify(message, null, 2));

                if (message.type === "user_input_request") {
                    console.log("\n❓ AGENT PROMPT:", message.data);
                    
                    rl.question('Enter your response to the agent: ', (answer) => {
                        const response = {
                            type: 'user_input_response',
                            data: answer, 
                        };
                        console.log('>>> SENDING RESPONSE TO AGENT >>>');
                        ws.send(JSON.stringify(response));
                    });
                }
            } catch (e) {
                console.log("Received non-JSON data:", data.toString());
            }
        });

        ws.on("close", (code, reason) => {
            const reasonText = reason.toString('utf8');
            console.log(`\n🛑 WebSocket connection closed. Code: ${code} (${reasonText})`);
            // Resolve the promise when the connection closes
            resolve(agentFinished); 
        });

        ws.on("error", (err) => {
            console.error("❌ WebSocket error:", err.message);
            // Resolve the promise on error
            resolve(false); 
        });
    });
}

// Main execution flow
async function main() {
    try {
        await listApplications();

	let applicationId= CONTINUE_APPLICATION
	if(! CONTINUE_APPLICATION)
        	applicationId = await startApplication(SCHEME_SLUG_TO_TEST);

        if (applicationId) {

            // Wait for the WebSocket session to complete (manual Ctrl+C, or agent close)
            connectToWebSocket(applicationId, AUTH_TOKEN);

            // Submitting the application after the WebSocket interaction finishes
            await submitApplication(applicationId);
            
        } else {
            console.log("\n⚠️ Failed to start application, skipping WebSocket and Submission.");
        }
    } catch (error) {
        console.error("An unhandled error occurred in the main flow:", error);
    } finally {
        // Ensure readline interface is closed
        if (!rl.closed) {
             rl.close();
        }
    }
}

main();
