package com.redisc;

import lombok.extern.slf4j.Slf4j;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

@Slf4j(topic = "c.Test")
public class Run {

    public static void main(String[] args) {
        ThreadPool threadPool = new ThreadPool(2, 2);
        for (int i = 0; i < 10; i++) {
            int j = i;
            threadPool.execute(() -> {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                log.debug("{}", j);
            });
        }
    }
}

@Slf4j(topic = "c.ThreadPool")
class ThreadPool {
    // 任务队列
    private BlockQuene<Runnable> taskQueue;
    // 线程集合
    private HashSet<Worker> workers = new HashSet<>();
    // 执行线程数
    private int coreSize;


    // 执行任务
    public void execute(Runnable task) {
        // 任务数没有超过 coreSize 时，直接交给 worker 执行
        // 如果任务超过 coreSize 时，加入任务队列暂存
        synchronized (workers) {
            if (workers.size() < coreSize) {
                Worker worker = new Worker(task);
                log.debug("新增 worker {} {}", worker, task);
                workers.add(worker);
                worker.start();
            } else {
                log.debug("加入任务队列 {}", task);
                taskQueue.put(task);
            }
        }
    }

    public ThreadPool(int coreSize, int queueCapcity) {
        this.coreSize = coreSize;
        taskQueue = new BlockQuene<>(queueCapcity);
    }

    class Worker extends Thread {
        private Runnable task;

        public Worker(Runnable task) {
            this.task = task;
        }

        @Override
        public void run() {
            // 执行任务
            // 当 task 不为空的时候，执行任务
            // 当 task 为空的时候，执行任务队列的任务

            while (task != null || (task = taskQueue.take()) != null) {// 没有超时
                try {
                    log.debug("正在执行... {}", task);
                    task.run();
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    log.debug("任务设置为空,{}", task);
                    task = null;
                }
            }

            synchronized (workers) {
                workers.remove(this);
            }
        }
    }

}

// 阻塞队列
@Slf4j(topic = "c.BlockQuene")
class BlockQuene<T> {
    // 任务队列
    private Deque<T> queue = new ArrayDeque<>();
    // 锁
    private ReentrantLock lock = new ReentrantLock();
    // 满条件变量
    private Condition fullWaitSet = lock.newCondition();
    // 不满条件变量
    private Condition noFullWaitSet = lock.newCondition();
    // 容量
    private int capcity;

    public BlockQuene(int capcity) {
        this.capcity = capcity;
    }


    // 阻塞获取
    public T take() {
        lock.lock();
        try {
            while (queue.isEmpty()) {
                log.debug("队列为空");
                try {
                    noFullWaitSet.await();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
            T t = queue.removeFirst();
            log.debug("唤醒队列 ～ 进行添加");
            fullWaitSet.signalAll();
            return t;
        } finally {
            lock.unlock();
        }
    }

    // 阻塞添加
    public void put(T task) {
        lock.lock();
        try {
            while (queue.size() == capcity) {
                try {
                    log.debug("队列已满，等待...");
                    fullWaitSet.await();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
            log.debug("添加任务 {}", task);
            queue.addLast(task);
            noFullWaitSet.signalAll();
        } finally {
            lock.unlock();
        }
    }

    public int size() {
        lock.lock();
        try {
            return queue.size();
        } finally {
            lock.unlock();
        }
    }
}
