import { CONFIG } from "../config";

/**
 * Event service for real-time contract events via SSE
 */
class EventService {
    constructor() {
        this.eventSource = null;
        this.listeners = [];
        this.isConnected = false;
    }

    /**
     * Connect to SSE stream
     */
    connect(onEvent, onError) {
        if (this.isConnected) {
            console.log("Already connected to event stream");
            return;
        }

        try {
            this.eventSource = new EventSource(
                `${CONFIG.BACKEND_URL}/api/events/stream?contract=${CONFIG.CONTRACT_ID}`
            );

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === "event") {
                        // Notify all listeners
                        this.listeners.forEach((listener) => listener(data));

                        // Also call the provided callback
                        if (onEvent) {
                            onEvent(data);
                        }
                    } else if (data.type === "connected") {
                        console.log("Connected to event stream:", data.contractId);
                        this.isConnected = true;
                    }
                } catch (err) {
                    console.error("Failed to parse event:", err);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error("SSE error:", error);
                this.isConnected = false;

                if (onError) {
                    onError(error);
                }

                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        console.log("Attempting to reconnect...");
                        this.disconnect();
                        this.connect(onEvent, onError);
                    }
                }, 5000);
            };
        } catch (error) {
            console.error("Failed to connect to event stream:", error);
            if (onError) {
                onError(error);
            }
        }
    }

    /**
     * Add event listener
     */
    addEventListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(listener) {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }

    /**
     * Disconnect from stream
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.isConnected = false;
            console.log("Disconnected from event stream");
        }
    }
}

// Singleton instance
const eventService = new EventService();

export default eventService;
