import { root } from '../util/root';
import { Action } from './Action';
/**
 * We need this JSDoc comment for affecting ESDoc.
 */
export class AsyncAction extends Action {
    /**
     * @param {?} scheduler
     * @param {?} work
     */
    constructor(scheduler, work) {
        super(scheduler, work);
        this.scheduler = scheduler;
        this.work = work;
        this.pending = false;
    }
    /**
     * @param {?=} state
     * @param {?=} delay
     * @return {?}
     */
    schedule(state, delay = 0) {
        if (this.closed) {
            return this;
        }
        // Always replace the current state with the new state.
        this.state = state;
        // Set the pending flag indicating that this action has been scheduled, or
        // has recursively rescheduled itself.
        this.pending = true;
        const /** @type {?} */ id = this.id;
        const /** @type {?} */ scheduler = this.scheduler;
        //
        // Important implementation note:
        //
        // Actions only execute once by default, unless rescheduled from within the
        // scheduled callback. This allows us to implement single and repeat
        // actions via the same code path, without adding API surface area, as well
        // as mimic traditional recursion but across asynchronous boundaries.
        //
        // However, JS runtimes and timers distinguish between intervals achieved by
        // serial `setTimeout` calls vs. a single `setInterval` call. An interval of
        // serial `setTimeout` calls can be individually delayed, which delays
        // scheduling the next `setTimeout`, and so on. `setInterval` attempts to
        // guarantee the interval callback will be invoked more precisely to the
        // interval period, regardless of load.
        //
        // Therefore, we use `setInterval` to schedule single and repeat actions.
        // If the action reschedules itself with the same delay, the interval is not
        // canceled. If the action doesn't reschedule, or reschedules with a
        // different delay, the interval will be canceled after scheduled callback
        // execution.
        //
        if (id != null) {
            this.id = this.recycleAsyncId(scheduler, id, delay);
        }
        this.delay = delay;
        // If this action has already an async Id, don't request a new one.
        this.id = this.id || this.requestAsyncId(scheduler, this.id, delay);
        return this;
    }
    /**
     * @param {?} scheduler
     * @param {?=} id
     * @param {?=} delay
     * @return {?}
     */
    requestAsyncId(scheduler, id, delay = 0) {
        return root.setInterval(scheduler.flush.bind(scheduler, this), delay);
    }
    /**
     * @param {?} scheduler
     * @param {?} id
     * @param {?=} delay
     * @return {?}
     */
    recycleAsyncId(scheduler, id, delay = 0) {
        // If this action is rescheduled with the same delay time, don't clear the interval id.
        if (delay !== null && this.delay === delay) {
            return id;
        }
        // Otherwise, if the action's delay time is different from the current delay,
        // clear the interval id
        return root.clearInterval(id) && undefined || undefined;
    }
    /**
     * Immediately executes this action and the `work` it contains.
     * @param {?} state
     * @param {?} delay
     * @return {?}
     */
    execute(state, delay) {
        if (this.closed) {
            return new Error('executing a cancelled action');
        }
        this.pending = false;
        const /** @type {?} */ error = this._execute(state, delay);
        if (error) {
            return error;
        }
        else if (this.pending === false && this.id != null) {
            // Dequeue if the action didn't reschedule itself. Don't call
            // unsubscribe(), because the action could reschedule later.
            // For example:
            // ```
            // scheduler.schedule(function doWork(counter) {
            //   /* ... I'm a busy worker bee ... */
            //   var originalAction = this;
            //   /* wait 100ms before rescheduling the action */
            //   setTimeout(function () {
            //     originalAction.schedule(counter + 1);
            //   }, 100);
            // }, 1000);
            // ```
            this.id = this.recycleAsyncId(this.scheduler, this.id, null);
        }
    }
    /**
     * @param {?} state
     * @param {?} delay
     * @return {?}
     */
    _execute(state, delay) {
        let /** @type {?} */ errored = false;
        let /** @type {?} */ errorValue = undefined;
        try {
            this.work(state);
        }
        catch (e) {
            errored = true;
            errorValue = !!e && e || new Error(e);
        }
        if (errored) {
            this.unsubscribe();
            return errorValue;
        }
    }
    /**
     * @return {?}
     */
    _unsubscribe() {
        const /** @type {?} */ id = this.id;
        const /** @type {?} */ scheduler = this.scheduler;
        const /** @type {?} */ actions = scheduler.actions;
        const /** @type {?} */ index = actions.indexOf(this);
        this.work = null;
        this.delay = null;
        this.state = null;
        this.pending = false;
        this.scheduler = null;
        if (index !== -1) {
            actions.splice(index, 1);
        }
        if (id != null) {
            this.id = this.recycleAsyncId(scheduler, id, null);
        }
    }
}
function AsyncAction_tsickle_Closure_declarations() {
    /** @type {?} */
    AsyncAction.prototype.id;
    /** @type {?} */
    AsyncAction.prototype.state;
    /** @type {?} */
    AsyncAction.prototype.delay;
    /** @type {?} */
    AsyncAction.prototype.pending;
}
