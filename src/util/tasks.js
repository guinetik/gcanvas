export class TaskManager {
    constructor(workerUrl) {
      this.worker = new Worker(workerUrl);
      this.nextTaskId = 1;
      this.pendingTasks = new Map();
      
      // Set up message handler
      this.worker.onmessage = this.handleMessage.bind(this);
    }
    
    handleMessage(e) {
      const { taskId, status, result, error } = e.data;
      
      if (this.pendingTasks.has(taskId)) {
        const { resolve, reject } = this.pendingTasks.get(taskId);
        
        if (status === 'complete') {
          resolve(result);
        } else if (status === 'error') {
          reject(new Error(error));
        }
        
        // Remove the completed task
        this.pendingTasks.delete(taskId);
      }
    }
    
    runTask(taskName, params) {
      return new Promise((resolve, reject) => {
        const taskId = this.nextTaskId++;
        
        // Store the promise callbacks
        this.pendingTasks.set(taskId, { resolve, reject });
        
        // Send the task to the worker
        this.worker.postMessage({
          taskId,
          taskName,
          params
        });
      });
    }
    
    terminate() {
      this.worker.terminate();
    }
  }