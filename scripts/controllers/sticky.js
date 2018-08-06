import $ from 'zepto';
import Darwin from '../libs/custom/darwin';
import uid from 'uid';

function stickyHeader(element) {
    const $element = $(element);
    const $self = $(self);
    const $body = $('body');
    const $scroll = $element.clone().addClass('yr-sticky-scroll').attr('data-controller', '');
    const $all = $element.add($scroll);

    const id = uid();

    $element.data('yr-sticky-id', id);

    const update = () => $scroll.html($element.html());

    function scroll() {
        const scrollTop = $(document.documentElement).scrollTop();
        const offset = $('.yr-sticky-scroll.yr-sticky-stuck')
            .reduce((offset, other) =>
                ((other === $scroll[0])? offset : offset+$(other).height()),
                0);

        if($element.offset().top-offset < scrollTop) {
            // Account for the height of any marked sticky elements.
            $scroll.css('top', offset);
            $all.addClass('yr-sticky-stuck');
        }
        else {
            $scroll.css('top', '');
            $all.removeClass('yr-sticky-stuck');
        }
    }


    /**
     * Refresh DOM references when CMS edits have occurred.
     * (Otherwise we'll be referencing detached DOM.)
     */

    const darwin = new Darwin({
        callback(mutations) {
            if(mutations.some((mutation) => mutation.type === 'childList')) {
                update();
            }
        },

        // @todo May need to be a parent block.
        targets: [`[data-yr-sticky-id="${ id }"]`]
    });

    darwin.init();

    $scroll.appendTo($body);
    update();
    $self.on('scroll', scroll);

    return {
        sync() {
            update();
            scroll();
        },
        destroy() {
            $self.off('scroll', scroll);
            $scroll.remove();
            darwin.destroy();
        }
    };
}

export default stickyHeader;
