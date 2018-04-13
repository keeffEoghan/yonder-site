/**
 * Monkey patch for Squarespace Darwin - want access to the mutations in the callback.
 */

import Base from '@squarespace/darwin';

export class Darwin extends Base {
    get callback() {
        return this.wrappedCallback;
    }

    set callback(callback) {
        return this.wrappedCallback = (...rest) => {
            const out = callback(this.mutations, ...rest);

            this.mutations = null;

            return out;
        };
    }

    mutated(mutations) {
        return this.mutations = [
                ...(this.mutations || []),
                ...mutations
            ];
    }

    evaluateMutations(mutations, ...rest) {
        this.mutated(mutations);

        return super.evaluateMutations(mutations, ...rest);
    }
};

export default Darwin;
