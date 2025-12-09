
export class DebugTab {
  static instance;

  static getInstance() {
    if (!DebugTab.instance) DebugTab.instance = new DebugTab();
    return DebugTab.instance;
  }

  constructor() {
    this.createTab();
  }

  createTab() {
    this.tab = document.createElement("div");
    Object.assign(this.tab.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      right: "0",
      height: "30px",
      backgroundColor: "#333",
      color: "#fff",
      padding: "5px",
      cursor: "pointer",
      fontFamily: "monospace",
      zIndex: "10000",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    });

    this.tab.innerText = "Console";

    const buttonContainer = document.createElement("div");

    const createButton = (text, action) => {
      const btn = document.createElement("button");
      btn.innerText = text;
      Object.assign(btn.style, {
        marginLeft: "5px",
        padding: "2px 5px",
        fontFamily: "monospace",
        cursor: "pointer",
      });
      btn.onclick = action;
      return btn;
    };

    this.paused = false;
    this.scrollLock = true;

    buttonContainer.appendChild(
      createButton("Clear", () => (this.consoleArea.value = ""))
    );
    buttonContainer.appendChild(
      createButton("Pause", () => (this.paused = !this.paused))
    );
    buttonContainer.appendChild(
      createButton("Scroll Lock", () => (this.scrollLock = !this.scrollLock))
    );

    this.tab.appendChild(buttonContainer);
    document.body.appendChild(this.tab);

    this.consoleArea = document.createElement("textarea");
    Object.assign(this.consoleArea.style, {
      position: "fixed",
      bottom: "30px",
      left: "0",
      right: "0",
      height: "200px",
      display: "none",
      backgroundColor: "#111",
      color: "#0f0",
      fontFamily: "monospace",
      zIndex: "9999",
      padding: "10px",
      resize: "none",
    });
    this.consoleArea.readOnly = true;
    document.body.appendChild(this.consoleArea);

    this.tab.onclick = (e) => {
      if (e.target === this.tab) {
        this.consoleArea.style.display =
          this.consoleArea.style.display === "none" ? "block" : "none";
      }
    };
  }

  appendMessage(level, message, ...args) {
    if (this.paused) return;
    const fullMessage = `[${level.toUpperCase()}] ${message} ${args.join(
      " "
    )}\n`;
    this.consoleArea.value += fullMessage;
    if (this.scrollLock) {
      this.consoleArea.scrollTop = this.consoleArea.scrollHeight;
    }
  }

  log(message, ...args) {
    this.appendMessage("log", message, ...args);
  }

  warn(message, ...args) {
    this.appendMessage("warn", message, ...args);
  }

  error(message, ...args) {
    this.appendMessage("error", message, ...args);
  }

  table(data) {
    const formatted = JSON.stringify(data, null, 2);
    this.appendMessage("table", formatted);
  }

  groupCollapsed(label) {
    this.appendMessage("group", `Group Start: ${label}`);
  }

  groupEnd() {
    this.appendMessage("group", "Group End");
  }

  time(label) {
    this[`time_${label}`] = performance.now();
  }

  timeEnd(label) {
    const endTime = performance.now();
    const startTime = this[`time_${label}`];
    const duration = (endTime - startTime).toFixed(2);
    this.appendMessage("time", `${label}: ${duration} ms`);
  }
}
