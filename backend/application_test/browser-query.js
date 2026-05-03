// This script is for interacting with the backend API from a web browser.

document.addEventListener("DOMContentLoaded", () => {
  const logOutput = document.getElementById("log-output");

  
  const BASE_URL = "http://127.0.0.1:8000";




	// TODO
  const AUTH_TOKEN = " the token from the next js auth sdk should be here";

  const headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    "Content-Type": "application/json",
  };

  function log(message) {
    console.log(message);
    logOutput.textContent += `\n${typeof message === "object" ? JSON.stringify(message, null, 2) : message}`;
  }

  // 1. Function to list all applications using the browser's fetch API
  async function listApplications() {
    log("Fetching applications...");
    try {
      const response = await fetch(`${BASE_URL}/applications/`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      log("List Applications Response:");
      log(data);
      return data;
    } catch (error) {
      log(`Error listing applications: ${error.message}`);
    }
  }

  // 2. Function to start a new application for a scheme
  async function startApplication(schemeSlug) {
    log(`\nStarting application for scheme: ${schemeSlug}...`);
    try {
      const payload = { scheme_slug: schemeSlug };
      const response = await fetch(`${BASE_URL}/applications/start`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      log("Start Application Response:");
      log(data);
      if (data && data.status === 1 && data.data.application_id) {
        return data.data.application_id;
      }
    } catch (error) {
      log(`Error starting application: ${error.message}`);
    }
    return null;
  }

  // 3. Function to connect to the WebSocket using the browser's native WebSocket API
  function connectToWebSocket(applicationId, token) {
    if (!applicationId) {
      log("\nCannot connect to WebSocket without an application ID.");
      return;
    }

    const wsUrl = `${BASE_URL.replace("http", "ws")}/applications/ws/${applicationId}?token=${token}`;
    log(`\nConnecting to WebSocket at: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    ws.onopen = function () {
      log("WebSocket connection established. Waiting for agent messages...");
    };

    ws.onmessage = function (event) {
      try {
        const message = JSON.parse(event.data);
        log("\nReceived message from agent:");
        log(message);

        if (message.type === "user_input_request") {
          log("Agent is asking for input. Responding in 3 seconds...");
          setTimeout(() => {
            const response = {
              type: "user_input_response",
              data: "This is a test response from the browser client.",
            };
            log("Sending response:");
            log(response);
            ws.send(JSON.stringify(response));
          }, 3000);
        }
      } catch (e) {
        log(`\nReceived raw data from agent: ${event.data}`);
      }
    };

    ws.onclose = function (event) {
      log(
        `WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || "No reason given"}`,
      );
    };

    ws.onerror = function (error) {
      log(`WebSocket error: ${error.message || "An unknown error occurred."}`);
    };
  }

  // Main execution flow
  async function main() {
    logOutput.textContent = "Starting process...";
    await listApplications();

    const schemeSlugToTest = "solap";
    const newApplicationId = await startApplication(schemeSlugToTest);

    if (newApplicationId) {
      connectToWebSocket(newApplicationId, AUTH_TOKEN);
    } else {
      log(
        "\nCould not start application, so WebSocket connection will not be established.",
      );
    }
  }

  main();
});
