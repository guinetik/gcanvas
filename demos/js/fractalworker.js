/**
 * Worker for the fractal demo.
 */

/**
 * Handle messages from the main thread.
 * @param {MessageEvent} e - The message event.
 */
self.onmessage = function (e) {
  if (e.data.taskName === "generateFractal") {
    //console.time("generateFractal");
    const { width, height } = e.data.params;
    //console.log("fractalworker", e.data.params);
    // Generate the raw fractal data
    const rawData = generateFractalData(width, height, e.data.params.fractalFunction, e.data.params.args);
    //console.log("rawData",  e.data.params.args);
    // Create and fill the image data
    const imageData = new ImageData(width, height);
    // Apply color scheme
    const coloredData = applyColorScheme(rawData, imageData, e.data.params.colorFunction, e.data.params.colorArgs);
    //console.log("coloredData", coloredData);
    // Send back the completed image data using the format TaskManager expects
    self.postMessage(
      {
        taskId: e.data.taskId, // Include the taskId
        status: 'complete',    // Use 'complete' status
        result: {              // Put the data inside 'result'
          image: coloredData,
          settings: e.data.params
        }
      },
      [coloredData.data.buffer]
    );
    //console.timeEnd("generateFractal");
  }
};

/**
 * Generate the raw fractal data.
 * @param {number} width - The width of the fractal.
 * @param {number} height - The height of the fractal.
 * @param {string} fractalFunction - The fractal function.
 * @param {Array} fractalArgs - The arguments for the fractal function.
 * @returns {Array} The raw fractal data.
 */
function generateFractalData(width, height, fractalFunction, fractalArgs) {
  try {
    // For class methods, we need to convert to a standalone function
    // This extracts just the function part without the name
    const functionStr = fractalFunction.replace(/^[^(]+/, "function");
    // Create the function from the string
    const f = new Function("return (" + functionStr + ")")();
    // Execute the function with our parameters
    return f(width, height, ...fractalArgs);
  } catch (error) {
    console.error("Error evaluating fractal function:", error);
    console.log("Function string:", fractalFunction);
    throw error;
  }
}

function applyColorScheme(rawData, imageData, colorFunction, colorArgs) {
  try {
    const functionStr = colorFunction.replace(/^[^(]+/, "function");

    // Create the function from the string
    const f = new Function("return (" + functionStr + ")")();
    // Execute the function with our parameters
    return f(rawData, imageData, ...colorArgs, hslToRgb);
  } catch (error) {
    console.error("Error evaluating color function:", error);
    console.log("Function string:", colorFunction);
    throw error;
  }
}

// Copied from Painter.colors for convenience.
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  let [r, g, b] = [0, 0, 0];

  if (hPrime >= 0 && hPrime < 1) [r, g, b] = [c, x, 0];
  else if (hPrime >= 1 && hPrime < 2) [r, g, b] = [x, c, 0];
  else if (hPrime >= 2 && hPrime < 3) [r, g, b] = [0, c, x];
  else if (hPrime >= 3 && hPrime < 4) [r, g, b] = [0, x, c];
  else if (hPrime >= 4 && hPrime < 5) [r, g, b] = [x, 0, c];
  else if (hPrime >= 5 && hPrime < 6) [r, g, b] = [c, 0, x];

  const m = l - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}