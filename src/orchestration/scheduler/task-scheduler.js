/* TaskScheduler: Preemptive task scheduling, debouncing, and AbortController lifecycle for Etchloom v2.
 * Pure JavaScript, zero dependencies, compatible with Node.js and Browser/Worker.
 */
(function(root) {
  'use strict';

  class TaskScheduler {
    /**
     * @param {number} debounceMs - Default debounce window in milliseconds (default 60ms)
     */
    constructor(debounceMs = 60) {
      this.debounceMs = debounceMs;
      this.timer = null;
      this.pendingResolve = null;
      this.currentAbortController = null;
      this._isExecuting = false;
    }

    /**
     * Schedule an asynchronous task with debouncing and preemption of running tasks.
     * @param {Function} taskFn - (signal: AbortSignal) => Promise<any>
     * @param {number} [customDebounceMs] - Optional override for debounce window
     * @returns {Promise<{ aborted: boolean, result?: any, reason?: string }>}
     */
    schedule(taskFn, customDebounceMs = null) {
      const delay = customDebounceMs !== null ? customDebounceMs : this.debounceMs;

      // Clean up previous debounced pending request
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      if (this.pendingResolve) {
        this.pendingResolve({ aborted: true, reason: 'DEBOUNCED' });
        this.pendingResolve = null;
      }

      return new Promise((resolve, reject) => {
        this.pendingResolve = resolve;

        const execute = async () => {
          this.timer = null;
          this.pendingResolve = null;

          // Preempt any actively running asynchronous job
          if (this.currentAbortController) {
            this.currentAbortController.abort('SUPERSEDED_BY_NEW_INPUT');
          }

          const controller = new AbortController();
          this.currentAbortController = controller;
          this._isExecuting = true;

          try {
            const result = await taskFn(controller.signal);
            if (controller.signal.aborted) {
              resolve({ aborted: true, reason: controller.signal.reason });
            } else {
              resolve({ aborted: false, result });
            }
          } catch (err) {
            if (controller.signal.aborted) {
              resolve({ aborted: true, reason: controller.signal.reason || err.message });
            } else {
              reject(err);
            }
          } finally {
            if (this.currentAbortController === controller) {
              this.currentAbortController = null;
              this._isExecuting = false;
            }
          }
        };

        if (delay <= 0) {
          execute();
        } else {
          this.timer = setTimeout(execute, delay);
        }
      });
    }

    /**
     * Cancel any pending timer and abort active execution immediately.
     * @param {string} [reason='USER_CANCEL']
     */
    cancelActive(reason = 'USER_CANCEL') {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      if (this.pendingResolve) {
        this.pendingResolve({ aborted: true, reason });
        this.pendingResolve = null;
      }
      if (this.currentAbortController) {
        this.currentAbortController.abort(reason);
        this.currentAbortController = null;
      }
      this._isExecuting = false;
    }

    /**
     * Returns true if a task is currently executing.
     */
    get isBusy() {
      return this._isExecuting;
    }

    /**
     * Returns true if a timer is pending before execution.
     */
    get isPending() {
      return this.timer !== null;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskScheduler;
  } else {
    root.TaskScheduler = TaskScheduler;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
