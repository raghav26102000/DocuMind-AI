// This script is for interacting with the backend DPR generation API.
// You will need to have node.js, axios, and ws installed to run this.
// Install with: npm install axios ws

const axios = require("axios");
const WebSocket = require("ws");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://127.0.0.1:8000"; // Change if your backend runs elsewhere
const AUTH_TOKEN = process.env.AUTH_TOKEN_BACKEND;

const headers = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  "Content-Type": "application/json",
};

// Function to connect to the WebSocket for live DPR generation
function connectToDprWebSocket(schemeSlug, token) {
  if (!schemeSlug) {
    console.error("\nCannot connect to WebSocket without a scheme slug.");
    return;
  }
  if (!token) {
    console.error("\nCannot connect to WebSocket without an auth token.");
    return;
  }

  // Pass the auth token as a query parameter for WebSocket authentication
  const wsUrl = `${BASE_URL.replace("http", "ws")}/schemes/${schemeSlug}/dpr?token=${token}`;
  console.log(`
Connecting to WebSocket at: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  ws.on("open", function open() {
    console.log(
      "WebSocket connection established. Waiting for agent messages...",
    );
  });

  ws.on("message", function incoming(data) {
    try {
      const message = JSON.parse(data);

      if (message.type === "dpr_result") {
        console.log("\nReceived DPR result from agent:");
        console.log(`File Name: ${message.file_name}`);
        console.log("Decoding and saving PDF...");
        const pdfData = Buffer.from(message.data, "base64");
        fs.writeFileSync(message.file_name || "DPR.pdf", pdfData);
        console.log(
          `Successfully saved DPR to ${message.file_name || "DPR.pdf"}`,
        );
        ws.close();
        return;
      }

      console.log("\nReceived message from agent:");
      console.log(JSON.stringify(message, null, 2));

      if (message.type === "user_input_request") {
        console.log(
          "Agent is asking for input. Enter your multi-line answer or a file path. End with 'EOF' on a new line:",
        );
        console.log(message.data);

        // Switch to a multi-line input mode
        let fullInput = "";
        process.stdin.setEncoding("utf8");
        process.stdin.resume();

        const onData = (chunk) => {
          fullInput += chunk;
          if (fullInput.trim().endsWith("EOF")) {
            process.stdin.removeListener("data", onData);
            process.stdin.pause();
            process.stdin.removeAllListeners("end"); // Remove the 'end' listener to avoid issues later

            // Process the input
            fullInput = fullInput.replace(/\s*EOF\s*$/, "").trim();
            handleUserInput(fullInput);
          }
        };

        const onEnd = () => {
          // Handle case where input stream ends unexpectedly
          process.stdin.removeListener("data", onData);
          handleUserInput(fullInput);
        };

        process.stdin.on("data", onData);
        process.stdin.on("end", onEnd);
      }
    } catch (e) {
      console.log("\nReceived raw data from agent:", data.toString());
    }
  });

  ws.on("close", function close(code, reason) {
    console.log(
      `\nWebSocket connection closed. Code: ${code}, Reason: ${reason.toString()}`,
    );
    rl.close();
  });

  ws.on("error", function error(err) {
    console.error("WebSocket error:", err.message);
    rl.close();
  });

  function handleUserInput(answer) {
    let response;
    if (fs.existsSync(answer)) {
      try {
        const fileContent = fs.readFileSync(answer);
        const base64Content = fileContent.toString("base64");
        response = {
          type: "user_input_response",
          file_name: path.basename(answer),
          data: base64Content,
        };
        console.log(`Sending file ${answer}...`);
      } catch (e) {
        console.error("Error reading file:", e);
        response = {
          type: "user_input_response",
          data: `Error reading file: ${e.message}`,
        };
      }
    } else {
      response = {
        type: "user_input_response",
        data: answer,
      };
      console.log("Sending text response...");
    }
    ws.send(JSON.stringify(response));
  }
}

// Main execution flow
async function main() {
  const schemeSlugToTest = "ddugavyuk";
  console.log(`Starting DPR generation for scheme: ${schemeSlugToTest}`);
  connectToDprWebSocket(schemeSlugToTest, AUTH_TOKEN);
}

main();
