'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const TaskScheduler = require('../src/orchestration/scheduler/task-scheduler.js');

test('TaskScheduler: debounces multiple rapid calls and only executes final task', async () => {
  const scheduler = new TaskScheduler(40);
  let executedCount = 0;
  let finalResult = null;

  const promises = [];
  for (let i = 1; i <= 20; i++) {
    const promise = scheduler.schedule(async (signal) => {
      executedCount++;
      return `job_${i}`;
    });
    promises.push(promise);
  }

  const results = await Promise.all(promises);
  assert.equal(executedCount, 1, 'only 1 task actually executed despite 20 rapid schedules');
  const finished = results[results.length - 1];
  assert.equal(finished.aborted, false);
  assert.equal(finished.result, 'job_20');
});

test('TaskScheduler: preempts and aborts running task when new task is scheduled', async () => {
  const scheduler = new TaskScheduler(0); // immediate dispatch
  let task1Aborted = false;

  // Launch long task 1
  const p1 = scheduler.schedule(async (signal) => {
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        task1Aborted = true;
        resolve('task1_caught_abort');
      });
      setTimeout(() => resolve('task1_finished_normally'), 200);
    });
  });

  // Small delay then launch task 2 (preempting task 1)
  await new Promise(r => setTimeout(r, 20));
  const p2 = scheduler.schedule(async (signal) => {
    return 'task2_success';
  });

  const [res1, res2] = await Promise.all([p1, p2]);
  assert.equal(task1Aborted, true, 'task 1 received abort signal');
  assert.equal(res1.aborted, true, 'task 1 reported as aborted');
  assert.equal(res2.aborted, false, 'task 2 executed cleanly');
  assert.equal(res2.result, 'task2_success');
});

test('TaskScheduler: cancelActive immediately halts timer and active execution', async () => {
  const scheduler = new TaskScheduler(100);
  let ran = false;

  scheduler.schedule(async () => {
    ran = true;
    return 'ok';
  });

  assert.equal(scheduler.isPending, true);
  scheduler.cancelActive('USER_MANUAL_STOP');
  assert.equal(scheduler.isPending, false);
  assert.equal(scheduler.isBusy, false);

  await new Promise(r => setTimeout(r, 120));
  assert.equal(ran, false, 'scheduled task did not run after cancelActive');
});
