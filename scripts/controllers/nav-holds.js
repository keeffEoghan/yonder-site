import { Lifecycle } from '@squarespace/core';
import { refresh } from '@squarespace/controller';

function navHolds(element) {
    const o = document.querySelector('#eok');

    if(o.classList.contains('eok-done')) {
        return;
    }

    let done = false;

    function go() {
        if(!done && document.readyState.match(/(interactive|complete)/gi)) {
            const f = document.createDocumentFragment();
            const d = document.createElement('div');

            f.appendChild(d);

            d.innerHTML = '12345678'.replace(/./gi, `
                <squarespace:block-field id="eok-block-$&" columns="12">
                </squarespace:block-field>
            `);

            console.log(d.innerHTML);

            const n = f.firstChild;

            o.parentNode.insertBefore(f, o);
            o.classList.add('eok-done');

            console.log('eok - done', o, f, n);
            done = true;
            document.removeEventListener('readystatechange', go);

            setTimeout(() => {
                    Lifecycle.init();
                    refresh();
                },
                0);
        }
    }

    document.addEventListener('readystatechange', go);
    go();
}

export default navHolds;
