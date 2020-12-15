declare global {
    interface Promise<T> {
        shouldRevertWith(reason: string): Promise<void>;
        shouldHaveResult<TResult>(expectedResult: TResult): Promise<void>;
    }
}
const EVM_REVERT_ERROR_PREFIX = "Returned error: VM Exception while processing transaction: revert ";

Promise.prototype.shouldRevertWith = async function(reason: string) {
    try {
        await this;
    } catch (e) {
        assert(e.message.startsWith(EVM_REVERT_ERROR_PREFIX + reason), `Expected revert reason '${reason}', but got '${e}' error instead`);
        return;
    }

    assert(false, "Transaction was not reverted");
}

Promise.prototype.shouldHaveResult = async function<TResult>(expectedResult: TResult) {
    let result = await this;
    assert(result == expectedResult, `Expected result was'${expectedResult}', but got '${result}' instead`);
}

export {};
