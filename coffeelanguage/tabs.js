function transitionTab(tab, active) {
    var tabContent = tab.querySelector(".tab-content");
    if (!tabContent) {
        return;
    }
    if (active) {
        tabContent.style.height = `0`;
    } else {
        tabContent.style.height = `${tabContent.scrollHeight}px`;
    }
}

function makeTabsInteractive() {
    const tabHeaders = document.querySelectorAll('.header');
    let openTab = null;

    function getSelectedTab(event) {
        return event.target.closest('.tab');
    }

    tabHeaders.forEach(function (tabHeader) {
        if ('ontouchstart' in document.documentElement) {
            tabHeader.parentNode.addEventListener("click", function (event) {
                const selectedTab = getSelectedTab(event);
                if (!selectedTab) {
                    return;
                }
                if (openTab && selectedTab !== openTab) {
                    transitionTab(openTab, true);
                    openTab.classList.remove("active");
                }
                
                openTab = selectedTab;
                transitionTab(selectedTab, false);
                selectedTab.classList.add("active");
            });
        } else {
            tabHeader.parentNode.addEventListener("mouseover", function (event) {
                const selectedTab = getSelectedTab(event);
                if (!selectedTab) {
                    return;
                }
                if (openTab && selectedTab !== openTab) {
                    transitionTab(openTab, true);
                    openTab.classList.remove("active");
                }

                openTab = selectedTab;
                transitionTab(selectedTab, false);
                selectedTab.classList.add("active");
            });

            tabHeader.parentNode.addEventListener("mouseout", function (event) {
                const selectedTab = getSelectedTab(event);
                if (!selectedTab) {
                    return;
                }
                if (selectedTab === openTab && ![...document.querySelectorAll(".tab")].some(tab => tab.matches(':hover'))){
                    transitionTab(openTab, true);
                    openTab.classList.remove("active");
                    openTab = null;
                }
            });
        }
    });
}

window.addEventListener('DOMContentLoaded', function() {
    makeTabsInteractive();
});