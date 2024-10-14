// content.js
// import "lib/marked.min.js";
console.log("LP Firefox extension loaded")

// test pages:
// https://code.launchpad.net/~a-dubs/cloudware/+git/oraclelib/+merge/455155
// https://code.launchpad.net/~gjolly/cloudware/+git/cinteract/+merge/461516

var DIFF_TEXT = "";
var MP = {};
var INLINE_COMMENTS = [];
var GROUPED_INLINE_COMMENTS = {};


function cleanup_previous_elements() {
    console.log("cleaning up previous elements")
    // remove elements that may have been injected at a previous time
    if (document.querySelector("#ci_cd_status_row")) {
        document.querySelector("#ci_cd_status_row").remove()
    }
    if (document.querySelector("#custom-diff-area")) {
        document.querySelector("#custom-diff-area").remove()
    }
    // cleanup any comment cards that may have been created
    document.querySelectorAll(".d2h-code-comment-card").forEach(card => {
        card.remove();
    });
    if (document.querySelector("#diff-view-switcher")) {
        document.querySelector("#diff-view-switcher").remove();
    }
    if (document.querySelector(".show-old-diff-button")) {
        document.querySelectorAll(".show-old-diff-button").forEach(button => {
            button.remove();
        });
    }
}


function renderDivsInnerTextAsMarkdown(querySelectorString) {
    const target_divs = document.querySelectorAll(querySelectorString);
    var converter = new showdown.Converter();
    target_divs.forEach((div) => {
        const originalText = div.innerText;
        var html = converter.makeHtml(originalText);
        div.innerHTML = html;
    });
}


function doMarkdownCommentsStuff() {
    renderDivsInnerTextAsMarkdown("#description .yui3-editable_text-text");
    renderDivsInnerTextAsMarkdown(".comment-text.editable-message-text");
}


function parseCICDState(comment) {
    return (comment.querySelector(".boardCommentActivity").innerText === "review: Approve (continuous-integration)") ? "Passing" : "Failing";
}


function replaceCICDComments() {
    const comments = document.querySelectorAll(".boardComment")
    var most_recent_ci_cd_state = "";
    var most_recent_ci_cd_job_link = "";
    // const most_recent_ci_cd_state
    comments.forEach(comment => {
        if (comment.querySelector(".boardCommentDetails a").innerText === "CPC CI Bot (cpc-ci-bot)") {
            most_recent_ci_cd_state = parseCICDState(comment)
            most_recent_ci_cd_job_link = comment.querySelector(".boardCommentBody a").href
            // comment.remove()
            comment.style.display = "none";
        }
    });
    console.log("CI/CD: " + most_recent_ci_cd_state)
    return { state: most_recent_ci_cd_state, link: most_recent_ci_cd_job_link }
}


function createNewCICDElement(state, link) {
    const newCICD = document.createElement("div")
    const target_table = document.querySelector("#proposal-summary");
    const table_body = target_table.querySelector("tbody");
    const new_row = document.createElement("tr");
    new_row.setAttribute("id", "ci_cd_status_row");
    const new_h = document.createElement("th");
    const new_td = document.createElement("td");
    new_h.innerText = "CI/CD Status:";
    const cicd_text = document.createElement("a");
    cicd_text.setAttribute("id", "ci_cd_status_text");
    cicd_text.innerText = state;
    cicd_text.classList.add(String(state).toLowerCase());
    cicd_text.href = link;
    cicd_text.target = "_blank";
    // insert as second row in table
    new_row.appendChild(new_h);
    new_td.appendChild(cicd_text);
    new_row.appendChild(new_td);
    table_body.insertBefore(new_row, table_body.childNodes[2]);

}


function parseDiffTextFromExistingDiv() {
    const diff = document.querySelector("#review-diff tbody").innerText
    const lines = document.querySelectorAll("#review-diff td.text")
    // get text from each line and combine into one string
    let diff_txt = "";
    lines.forEach(line => {
        // console.log(line.innerText)
        diff_txt += line.innerText + "\n"
    });
    // console.log(diff_txt)
    DIFF_TEXT = diff_txt;
    return diff_txt
}

function performDiffViewerMods(collapsedDiffIds) {

    // get all "headers" for each file's diff
    const headers = document.querySelectorAll(".d2h-file-wrapper .d2h-file-name-wrapper")
    console.log(headers)
    headers.forEach(header => {
        const rightDiv = document.createElement("div");
        rightDiv.classList.add("right-div");
        const collapseButton = document.createElement("button");
        collapseButton.classList.add("collapse-button")
        collapseButton.addEventListener("click", () => {
            const parentDiffElement = header.parentElement.parentElement;
            const diffViewContent = parentDiffElement.querySelector(".d2h-files-diff") || parentDiffElement.querySelector(".d2h-file-diff")
            if (collapseButton.innerText === "Expand") {
                // diffViewContent.style.display = ""
                collapseButton.innerText = "Collapse"
                parentDiffElement.classList.remove("collapsed");
            }
            else {
                // diffViewContent.style.display = "none"
                collapseButton.innerText = "Expand"
                parentDiffElement.classList.add("collapsed");
            }
        });
        // apply collapsed state to any diffs that were previously collapsed
        const parentDiffElement = header.parentElement.parentElement;
        if (collapsedDiffIds.includes(parentDiffElement.id)) {
            collapseButton.innerText = "Expand";
            parentDiffElement.classList.add("collapsed");
            const diffViewContent = parentDiffElement.querySelector(".d2h-files-diff") || parentDiffElement.querySelector(".d2h-file-diff");

            // diffViewContent.style.height = 0;
            // document.querySelector(".d2h-file-side-diff").display = "inline-block";
        }
        else {
            collapseButton.innerText = "Collapse";
        }

        rightDiv.appendChild(collapseButton);
        header.appendChild(rightDiv);
        // header.appendChild(collapseButton);
    });

    // get all .d2h-file-name <a> elements and remove their hrefs and instead scroll to the corresponding diff using the
    // diff id from the href
    const filenameLinks = document.querySelectorAll("a.d2h-file-name")
    filenameLinks.forEach(link => {
        const diffId = link.getAttribute("href").split("#")[1];
        link.setAttribute("data-diff-id", diffId);
        link.removeAttribute("href");
        link.addEventListener("click", () => {
            const diffId = link.getAttribute("data-diff-id");
            const diff = document.getElementById(diffId);
            diff.scrollIntoView();
            // expand the diff if it's collapsed
            if (diff.classList.contains("collapsed")) {
                diff.querySelector(".collapse-button").click();
            }
        });
    });
}

function createOrUpdateDiffViewer(unified_view) {
    // check if diff viewer already exists
    if (document.querySelector("#diff-viewer")) {
        diffViewer = document.querySelector("#diff-viewer")
        // cleanup existing artefacts such as the view switcher
        if (document.querySelector("#diff-view-switcher")) {
            document.querySelector("#diff-view-switcher").remove();
        }
    }
    else { // create new diff viewer
        // create new div to hold all diff stuff
        const customDiffArea = document.createElement("div")
        customDiffArea.setAttribute("id", "custom-diff-area")
        // create new div to inject diff viewer into
        const diffViewer = document.createElement("div")
        diffViewer.setAttribute("id", "diff-viewer")
        // create button that will switch between new custom diff viewer and old launchpad diff viewer
        const showOldDiffButton = document.createElement("button");
        showOldDiffButton.classList.add("show-old-diff-button");
        showOldDiffButton.innerText = "Show old diff viewer";
        showOldDiffButton.addEventListener("click", () => {
            // check button's text and toggle between showing old and new diff viewer
            if (showOldDiffButton.innerText === "Show old diff viewer") {
                showOldDiffButton.innerText = "Show new diff viewer";
                document.querySelector(".diff-content").style.display = "";
                diffViewer.style.display = "none";
                showOldDiffButton.classList.remove("showing-new-diff");
                showOldDiffButton.classList.add("showing-old-diff");
            }
            else {
                showOldDiffButton.innerText = "Show old diff viewer";
                document.querySelector(".diff-content").style.display = "none";
                diffViewer.style.display = "";
                showOldDiffButton.classList.remove("showing-old-diff");
                showOldDiffButton.classList.add("showing-new-diff");
            }

        });

        // insert new diff viewer div into customDiffArea
        customDiffArea.appendChild(diffViewer)
        // insert customDiffArea before old diff area that we're replacing
        document.querySelector("#review-diff").insertBefore(showOldDiffButton, document.querySelector(".diff-content"))
        document.querySelector("#review-diff").insertBefore(customDiffArea, document.querySelector(".diff-content"))
        // hide old diff (.diff-content)
        document.querySelector(".diff-content").style.display = "none";
        // document.querySelector(".diff-content").style.height = 0;
        // document.querySelector(".diff-content").style.overflow = "hidden";
    }
    var diff_txt = parseDiffTextFromExistingDiv()
    const diffViewerElement = document.querySelector("#diff-viewer");
    // before clearing the innerHTML, get all collapsed diffs and store their ids
    const collapsedDiffIds = [];
    document.querySelectorAll(".d2h-file-wrapper.collapsed").forEach(diff => {
        collapsedDiffIds.push(diff.id);
    });
    diffViewerElement.innerHTML = "";
    diffViewerElement.innerHTML = Diff2Html.html(diff_txt, {
        drawFileList: true,
        matching: 'lines',
        outputFormat: unified_view ? 'unified' : 'side-by-side',
    });

    performDiffViewerMods(collapsedDiffIds);

}

function addDiffViewSwitcher() {

    const viewSwitcher = document.createElement("button");
    viewSwitcher.innerText = "View as side-by-side";
    viewSwitcher.setAttribute("id", "diff-view-switcher");
    viewSwitcher.addEventListener("click", () => {
        // const diffViewerElement = document.querySelector("#diff-viewer")
        console.log("view-switcher clicked")
        if (viewSwitcher.innerText === "View as unified") {
            viewSwitcher.innerText = "View as side-by-side";
            createOrUpdateDiffViewer(unified_view = true);
            // insert viewSwitcher between the file list and the diff viewer
            // diffViewerElement.insertBefore(viewSwitcher, diffViewerElement.childNodes[1]);
        }
        else {
            viewSwitcher.innerText = "View as unified";
            createOrUpdateDiffViewer(unified_view = false);
            // insert viewSwitcher between the file list and the diff viewer
            // diffViewerElement.insertBefore(viewSwitcher, diffViewerElement.childNodes[1]);
        }
    });

    const customDiffArea = document.querySelector("#custom-diff-area");
    // insert at top of customDiffArea
    customDiffArea.insertBefore(viewSwitcher, customDiffArea.childNodes[0]);

}

function doCustomDiffStuff() {
    // add diff viewer
    createOrUpdateDiffViewer(unified_view = true);
    addDiffViewSwitcher();
}

function doCiCdStuff() {
    var cicd_info = replaceCICDComments()
    if (cicd_info.state !== "") {
        createNewCICDElement(cicd_info.state, cicd_info.link)
    }
    else {
        console.log("No CI/CD comments found")
    }
}

// inputs:
// - tr_element (HTML element): the table row element that the comment will be inserted below
// - commentElement (HTML element): the comment element to be inserted
// - line_no (int): the line number that the comment is associated with 
function insertInlineCommentElementBelowLine(tr_element, commentElement, line_no) {
    // check if a comment element already exists for this line
    const existingComment = document.querySelector(`#d2h-inline-comment-line-${line_no}`);
    if (existingComment) {
        console.log("comment already exists for line " + line_no)
        const commentContainer = existingComment.querySelector(".d2h-inline-comment-container");
        commentContainer.appendChild(commentElement);
        return;
    }

    // comment element will be empty for now
    const commentWrapperRow = document.createElement("tr");
    commentWrapperRow.classList.add("d2h-inline-comment-row");
    commentWrapperRow.id = `d2h-inline-comment-line-${line_no}`;

    const commentContainer = document.createElement("td");
    commentContainer.classList.add("d2h-inline-comment-container");
    commentContainer.setAttribute('colspan', '2');

    commentContainer.appendChild(commentElement);

    commentWrapperRow.appendChild(commentContainer);

    // insert after the tr element
    tr_element.insertAdjacentElement("afterend", commentWrapperRow);
}

function createEditableInlineCommentElement() {
    // TODO:
    // - when you press the cancel button, remove the container element as well. currently a blank line is left behind
    const header = document.createElement("div");
    header.classList.add("d2h-inline-comment-header");
    header.innerText = "Add inline comment:"

    const textarea = document.createElement("textarea");
    textarea.classList.add("d2h-inline-comment-textarea");
    textarea.setAttribute("placeholder", "Enter comment...");


    const footer = document.createElement("div");

    footer.classList.add("d2h-inline-comment-footer");

    const tabs = document.createElement("div");
    tabs.classList.add("d2h-inline-comment-tabs");
    const tab1 = document.createElement("button");
    tab1.innerText = "Edit Comment";
    tab1.classList.add("d2h-inline-comment-tab");
    tab1.classList.add("edit-comment");
    tab1.classList.add("active");
    const tab2 = document.createElement("button");
    tab2.innerText = "Preview Comment";
    tab2.classList.add("d2h-inline-comment-tab");
    tab2.classList.add("preview-comment");
    tabs.appendChild(tab1);
    tabs.appendChild(tab2);

    const preview = document.createElement("div");
    preview.classList.add("d2h-inline-comment-preview");
    preview.classList.add("markdown")
    preview.style.display = "none";

    const contentArea = document.createElement("div");
    contentArea.classList.add("d2h-inline-comment-content-area");
    contentArea.appendChild(textarea);
    contentArea.appendChild(preview);

    tab1.addEventListener("click", () => {
        tab1.classList.add("active");
        tab2.classList.remove("active");
        textarea.style.display = "block";
        preview.style.display = "none";
    });
    tab2.addEventListener("click", () => {
        tab2.classList.add("active");
        tab1.classList.remove("active");
        preview.style.display = "block";
        textarea.style.display = "none";
        converter = new showdown.Converter();
        preview.innerHTML = converter.makeHtml(textarea.value);

    });


    const saveDraftButton = document.createElement("button");
    saveDraftButton.innerText = "Save Draft";
    saveDraftButton.classList.add("d2h-inline-comment-button");
    saveDraftButton.classList.add("save-draft");
    const postButton = document.createElement("button");
    postButton.innerText = "Post Comment";
    postButton.classList.add("d2h-inline-comment-button");
    postButton.classList.add("post-comment");
    // cancel comment button
    const cancelButton = document.createElement("button");
    cancelButton.innerText = "Cancel";
    cancelButton.classList.add("d2h-inline-comment-button");
    cancelButton.classList.add("cancel-comment");
    cancelButton.addEventListener("click", () => {
        // remove the comment element
        editableInlineComment.remove();
    });
    footer.appendChild(cancelButton);
    footer.appendChild(saveDraftButton);
    footer.appendChild(postButton);

    const editableInlineComment = document.createElement("div");
    editableInlineComment.classList.add("d2h-inline-comment");
    // make the editable text wrap instead of extending horizontally
    editableInlineComment.style.whiteSpace = "pre-wrap";

    editableInlineComment.appendChild(header);
    editableInlineComment.appendChild(tabs);
    // editableInlineComment.appendChild(textarea);
    // editableInlineComment.appendChild(preview);
    editableInlineComment.appendChild(contentArea);
    editableInlineComment.appendChild(footer);

    // return as list even though it's only one element
    // this will allow for comment threads in the future
    return editableInlineComment;
}

function findDiffElementByFileName(fileName) {
    console.log("finding diff element by file name " + fileName)
    const file_diffs = document.querySelectorAll(".d2h-file-wrapper");
    for (const file_diff of file_diffs) {
        const file_name = file_diff.querySelector(".d2h-file-name").innerText;
        console.log(`${file_name} === ${fileName}?`)
        if (file_name === fileName) {
            return file_diff;
        }
    }
    return null;
}

// returns table row element
function findDiffLineElementByLineNumber(diffElement, lineNumber) {
    const tableRows = diffElement.querySelectorAll("tr");
    for (const row of tableRows) {
        if (parseInt(row.querySelector(".d2h-code-linenumber").innerText) === lineNumber) {
            return row;
        }
    };
    return null;
}

// function to return x number of lines before the target line number
// and y number of lines after the target line number including the target line
function getLinesAroundTargetLine(fileName, lineNumber, numberOfLinesBefore, numberOfLinesAfter) {
    const diffElement = findDiffElementByFileName(fileName);
    const lines = diffElement.querySelectorAll("tr");
    var targetLineIndex = -1;
    lines.forEach((line, index) => {
        if (parseInt(line.querySelector(".d2h-code-linenumber").innerText) === lineNumber) {
            targetLineIndex = index;
        }
    });
    if (targetLineIndex === -1) {
        console.log(`target line ${lineNumber} not found in file ${fileName}`);
        return null;
    }
    const linesArray = Array.from(lines);
    const linesBefore = linesArray.slice(targetLineIndex - numberOfLinesBefore, targetLineIndex);
    const targetLine = linesArray[targetLineIndex];
    const linesAfter = linesArray.slice(targetLineIndex + 1, targetLineIndex + numberOfLinesAfter + 1);
    // combine the before and after lines and the target line into one list and return that
    console.log(`returning ${linesBefore.concat(targetLine).concat(linesAfter).length} lines around line ${lineNumber} in file ${fileName}`);
    return linesBefore.concat(targetLine).concat(linesAfter);
}

function createInlineCommentElement(commentInfo) {
    // console.log("creating inline comment element for comment: " + commentInfo.commentText)
    const header = document.createElement("div");
    header.classList.add("d2h-inline-comment-header");
    // convert raw datetime (2024-03-11T16:32:09.664021+00:00) to human-readable format in local timezone
    const commentDate = new Date(commentInfo.commentDate).toLocaleString();
    header.innerText = commentInfo.author + " | " + commentDate + ":";

    const body = document.createElement("div");
    body.classList.add("d2h-inline-comment-body");
    converter = new showdown.Converter();
    body.innerHTML = converter.makeHtml(commentInfo.commentText);

    const customCommentElement = document.createElement("div");
    customCommentElement.classList.add("d2h-inline-comment");
    // commentElement.setAttribute("contenteditable", "true");
    // commentElement.setAttribute("placeholder", "Enter comment...");
    // make the editable text wrap instead of extending horizontally
    // customCommentElement.style.whiteSpace = "pre-wrap";

    customCommentElement.appendChild(header);
    customCommentElement.appendChild(body);

    // return as list even though it's only one element
    // this will allow for comment threads in the future
    return customCommentElement;

}

function extractFileAndLineFromDiff(lineNumber, diffTxt) {
    // if lineNumber is a string, convert it to an integer
    lineNumber = parseInt(lineNumber);

    // Split the diff into lines
    const lines = diffTxt.split("\n");

    let currentFile = null;
    let currentLineNumberInFile = 0;
    let addedLines = 0; // Track the number of lines added in the diff
    let removedLines = 0; // Track the number of lines removed in the diff

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect a file path in the diff
        if (line.startsWith("+++ ")) {
            currentFile = line.split(" ")[1].slice(2);
        } else if (line.startsWith("@@")) {
            // Parse chunk header to get starting line number in the file
            const chunkInfo = line.split("@@")[1];
            currentLineNumberInFile = parseInt(chunkInfo.split(" ")[2].split(",")[0]);

            // Reset added and removed line counters for each new chunk
            addedLines = 0;
            removedLines = 0;

            // Adjust line number for chunks starting from 0 (new files)
            if (currentLineNumberInFile === 0) {
                currentLineNumberInFile = 1;
            }
            continue;
        }

        // If the current line number in the diff matches the provided line number
        if (i + 1 === lineNumber) {
            return [currentFile, currentLineNumberInFile + addedLines - removedLines, line];
        }

        // Adjust line count based on whether lines are added, removed, or unchanged
        if (line.startsWith("+")) {
            addedLines++;
        } else if (line.startsWith("-")) {
            removedLines++;
        } else {
            // This accounts for unchanged lines which should also increase the current line number in file
            currentLineNumberInFile++;
        }
    }

    // If the line number was not found in the diff
    return [null, null, null];
}


async function fetchInlineComments() {

    const all_preview_diff_ids = get_all_available_preview_diff_ids();

    for (const preview_diff_id of all_preview_diff_ids) {
        try {
            const inline_comments = await fetch_inline_comments_from_api(preview_diff_id);
            console.log(`found ${inline_comments.length} inline comments for preview diff ${preview_diff_id}`);
            INLINE_COMMENTS = INLINE_COMMENTS.concat(inline_comments);
        } catch (error) {
            console.error(`Failed to fetch inline comments for preview diff ${preview_diff_id}:`, error);
        }
    }

    // group comments by file and line number
    // for each preview_diff_id, for each file, for each line number, create a list of comments
    INLINE_COMMENTS.forEach(inline_comment => {
        // Check if the previewDiffId exists in the grouped comments
        if (!(inline_comment.previewDiffId in GROUPED_INLINE_COMMENTS)) {
            GROUPED_INLINE_COMMENTS[inline_comment.previewDiffId] = {};
        }
    
        // Check if the file exists for the specific previewDiffId
        if (!(inline_comment.file in GROUPED_INLINE_COMMENTS[inline_comment.previewDiffId])) {
            GROUPED_INLINE_COMMENTS[inline_comment.previewDiffId][inline_comment.file] = {};
        }
    
        // Check if the line number exists for the specific file
        if (!(inline_comment.line_no in GROUPED_INLINE_COMMENTS[inline_comment.previewDiffId][inline_comment.file])) {
            GROUPED_INLINE_COMMENTS[inline_comment.previewDiffId][inline_comment.file][inline_comment.line_no] = [];
        }
    
        // Add the parsed comment to the appropriate group
        GROUPED_INLINE_COMMENTS[inline_comment.previewDiffId][inline_comment.file][inline_comment.line_no].push(inline_comment);
    });
    

    console.log("grouped inline comments",GROUPED_INLINE_COMMENTS)

    createCodeCommentCards(GROUPED_INLINE_COMMENTS);

    add_inline_comments_to_custom_diff();
    
}

function add_inline_comments_to_custom_diff() {

    const file_diffs = document.querySelectorAll(".d2h-file-wrapper");

    INLINE_COMMENTS.forEach(inline_commment => {
        // console.log(parsed_comment)
        // find the file diff that matches the comment's file
        file_diffs.forEach(file_diff => {
            const file_name = file_diff.querySelector(".d2h-file-name").innerText;
            if (file_name === inline_commment.file) {
                // TODO: move the gutter finding and insertion logic elsewhere to make adding multiple 
                // comments to the same line easier
                // gutter class is ".d2h-code-side-linenumber" for side-by-side view and ".d2h-code-linenumber" for unified view
                const gutters = file_diff.querySelectorAll(".d2h-code-side-linenumber , .d2h-code-linenumber");
                var target_gutter = null;

                // find all gutters with the same line number as the comment using the innerText
                gutters.forEach(element => {
                    if (parseInt(element.innerText) === inline_commment.line_no) {
                        target_gutter = element;
                    }
                });
                // console.log(target_gutter)
                if (target_gutter) {
                    insertInlineCommentElementBelowLine(target_gutter.parentElement, createInlineCommentElement(inline_commment), inline_commment.line_no);
                }
            }
        });
    });

}

function doInlineCommentsStuff() {

    // const target_line = document.querySelector(".d2h-diff-tbody").querySelectorAll("tr")[5]
    // insertInlineCommentElementBelowLine(target_line);

    // gutter class is ".d2h-code-side-linenumber" for side-by-side view and ".d2h-code-linenumber" for unified view 
    // add click event listener to each gutter element
    const gutters = document.querySelectorAll(".d2h-code-side-linenumber , .d2h-code-linenumber");
    gutters.forEach(gutter => {
        gutter.addEventListener("click", () => {
            console.log("gutter clicked")
            const tr_element = gutter.parentElement;
            createNewEditableInlineComment(tr_element);
        });
    });
}

function findBoardCommentToInsertAfter(commentDate) {
    // commentDate is a string in the format "2024-03-11T16:32:09.664021+00:00"
    const comments = document.querySelectorAll(".boardComment");
    // target time element:
    // <time itemprop="commentTime" datetime="2024-05-17T09:40:22.517036+00:00" title="2024-05-17 09:40:22 UTC">on
    // 2024-05-17</time>
    let newestComment = null;
    let newestCommentDate = null;
    for (const comment of comments) {
        const times = comment.querySelectorAll("time");
        // find time that has itemprop="commentTime"
        for (const time of times) {
            if (time.getAttribute("itemprop") === "commentTime") {
                if (time.getAttribute("datetime") < commentDate) {
                    // this comment is newer than the current newest comment
                    if (newestCommentDate === null || time.getAttribute("datetime") > newestCommentDate) {
                        newestComment = comment;
                        newestCommentDate = time.getAttribute("datetime");
                    }
                }
            }
        }
    }
    return newestComment;
}


// create a new card that contains X number of lines before the target line number
function createCodeCommentCards(groupedComments) {
    const active_preview_diff_id = get_active_preview_diff_id();
    // groupedComments.forEach(fileName => {
    for (const preview_diff_id in groupedComments) {
        for (const file in groupedComments[preview_diff_id]) {
            for (const line_no in groupedComments[preview_diff_id][file]) {
                const comments = groupedComments[preview_diff_id][file][line_no];

                const commentCard = document.createElement("div");
                commentCard.classList.add("d2h-code-comment-card");
                const header = document.createElement("div");
                header.classList.add("d2h-code-comment-card-header");
                const fileName = document.createElement("h3");
                fileName.innerText = file;
                const diffTable = document.createElement("table");
                diffTable.classList.add("d2h-diff-table");
                const diffTbody = document.createElement("tbody");
                diffTbody.classList.add("d2h-diff-tbody");
                const commentsContainer = document.createElement("div");
                commentsContainer.classList.add("d2h-code-comment-card-comments-container");
                
                header.appendChild(fileName);
                // if preview_diff_id is not the current active diff, add an "outdated" tag to header
                if (preview_diff_id !== active_preview_diff_id) {
                    const outdatedTag = document.createElement("span");
                    outdatedTag.classList.add("d2h-outdated-tag");
                    outdatedTag.classList.add("d2h-outdated-tag-right-align");
                    outdatedTag.innerText = "Outdated";
                    header.appendChild(outdatedTag);
                }
                commentCard.appendChild(header);
                commentCard.appendChild(diffTable);


                const diffLines = getLinesAroundTargetLine(comments[0].file, comments[0].line_no, 4, 0);
                // copy the diff lines into the diffTbody
                diffLines.forEach(line => {
                    const clonedLine = line.cloneNode(true); // clone the line element
                    diffTbody.appendChild(clonedLine); // append the cloned line element
                });
                diffTable.appendChild(diffTbody);


                // append comments 
                comments.forEach(comment => {
                    commentsContainer.appendChild(createInlineCommentElement(comment));
                });

                commentCard.appendChild(commentsContainer);
                
                // find the newest comment to insert after
                const newestComment = findBoardCommentToInsertAfter(comments[0].commentDate);

                // and then insert the comment card after the newest comment
                if (newestComment) {
                    newestComment.insertAdjacentElement("afterend", commentCard);
                }
                else {
                    // insert the comment card into the "#conversation" div
                    document.querySelector("#conversation").appendChild(commentCard);
                }

            }
        }
    }

    // hideAllBoardCommmentsWithInlineComments();
}

// given a row of the diff 
function createNewEditableInlineComment(tr_element) {
    const commentElement = createEditableInlineCommentElement();
    line_no = parseInt(tr_element.querySelector(".d2h-code-linenumber").innerText);
    insertInlineCommentElementBelowLine(tr_element, commentElement, line_no);

}


function fetchMPFromLPyd() {
    const webLink = document.location.href;
    const previewDiffLink = document.querySelector(".diff-link").href;
    const previewDiffID = previewDiffLink.split("/")[10];
    console.log(previewDiffID);
    const number_of_comments = document.querySelectorAll("#conversation .boardComment").length;

    const queryParams = new URLSearchParams({
        web_link: webLink,
        preview_diff_id: previewDiffID,
        number_of_comments: number_of_comments,
    });

    const endpoint = "http://127.0.0.1:6969/lpyd/mp" + "?" + queryParams.toString();
    console.log(endpoint);

    fetch(endpoint, { mode: 'cors' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            console.log(response)
            return response.json();
        })
        .then(data => {
            // Handle the response data here
            MP = data;
            doInlineCommentsStuff();
        })
        .catch(error => {
            // Handle errors here
            console.error('There was a problem with the fetch operation:', error);
        });

}

function convertMPUrlToAPIUrl(mpUrl) {
    // mp url:
    // https://code.launchpad.net/~a-dubs/cloudware/+git/oraclelib/+merge/455155

    // api url:
    // https://code.launchpad.net/api/devel/~a-dubs/cloudware/+git/oraclelib/+merge/455155
    
    const api_url = mpUrl.replace("https://code.launchpad.net/", "https://code.launchpad.net/api/devel/");
    return api_url;
}

/**
 * Retrieves all available preview diff IDs from the diff navigator select element.
 *
 * @returns {string[]} An array of preview diff IDs (strings).
 */
function get_all_available_preview_diff_ids() {
    const diff_selector = document.querySelector(".diff-navigator select");
    console.log("diff navigator: ", diff_selector);
    const preview_diff_ids = [];
    for (let i = 0; i < diff_selector.options.length; i++) {
        preview_diff_ids.push(diff_selector.options[i].value);
    }
    console.log("all available preview diff ids: ", preview_diff_ids);
    return preview_diff_ids;
}

/**
 * Gets the currently selected preview diff ID from the diff navigator select element.
 * @returns {string} The currently selected preview diff ID.
 */
function get_currently_selected_preview_diff_id() {
    const diff_selector = document.querySelector(".diff-navigator select");
    const preview_diff_id = diff_selector.options[diff_selector.selectedIndex].value;
    console.log("current preview diff id: " + preview_diff_id);
    return preview_diff_id;
}

function get_active_preview_diff_id() {
    const preview_diff_id = document.querySelector(".diff-link").href.split("/")[10];
    return preview_diff_id;
}

/**
 * 
 * @param {*} preview_diff_id : the preview diff to fetch inline comments for
 * @returns list of parsed inline comments
 */
async function fetch_inline_comments_from_api(preview_diff_id) {
    try {
        const mpUrl = document.location.href;
        const api_url = convertMPUrlToAPIUrl(mpUrl);

        const inline_comment_query_url = `${api_url}?ws.op=getInlineComments&previewdiff_id=${preview_diff_id}`;

        const response = await fetch(inline_comment_query_url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        console.log(data);

        return parseInlineCommentsFromAPIResponse(data, preview_diff_id);

    } catch (error) {
        console.error('Error fetching inline comments from api:', error);
        return []; // Return an empty array to prevent issues downstream
    }
}



/**
 * 
 * @param {*} apiResponse : list of inline comment objects from the API
 */
function parseInlineCommentsFromAPIResponse(apiResponse, preview_diff_id) {

    // we want to convert based on the old parsing:

// const comments = commentWrapper.querySelectorAll(".boardComment");
// const lineNum = commentWrapper.id.split("-")[3];
// const [file, line_no, lineContent] = extractFileAndLineFromDiff(parseInt(lineNum), DIFF_TEXT);
// comments.forEach(comment => {
//     // console.log(comment)
//     const details = comment.querySelector(".boardCommentDetails").innerText;
//     const author = details.split(" wrote on ")[0];
//     const commentDate = details.split(" wrote on ")[1].replace(":", "");
//     const commentText = comment.querySelector(".boardCommentBody").innerText;
//     // const commentDate = comment.querySelector(".boardCommentActivity").innerText;
//     parsed_comments.push({
//         originalDiffLineNum: lineNum,
//         author: author,
//         commentText: commentText,
//         commentDate: commentDate,
//         file: file,
//         line_no: line_no,
//         lineContent: lineContent
//     });
    // });
    
/*
    inline comment object:
    {
  "line_number": "50",
  "person": {
    "self_link": "https://code.launchpad.net/api/devel/~a-dubs",
    "web_link": "https://launchpad.net/~a-dubs",
    "resource_type_link": "https://code.launchpad.net/api/devel/#person",
    "all_specifications_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/all_specifications",
    "valid_specifications_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/valid_specifications",
    "recipes_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/recipes",
    "time_zone": "UTC",
    "private": false,
    "is_valid": true,
    "is_team": false,
    "account_status": "Active",
    "visibility": "Public",
    "name": "a-dubs",
    "display_name": "Alec Warren",
    "logo_link": "https://code.launchpad.net/api/devel/~a-dubs/logo",
    "is_probationary": false,
    "id": "tag:launchpad.net:2008:redacted",
    "karma": 14910,
    "homepage_content": null,
    "description": "",
    "mugshot_link": "https://code.launchpad.net/api/devel/~a-dubs/mugshot",
    "languages_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/languages",
    "hide_email_addresses": true,
    "date_created": "2023-06-15T14:50:38.394083+00:00",
    "sshkeys_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/sshkeys",
    "is_ubuntu_coc_signer": true,
    "gpg_keys_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/gpg_keys",
    "wiki_names_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/wiki_names",
    "irc_nicknames_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/irc_nicknames",
    "jabber_ids_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/jabber_ids",
    "social_accounts_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/social_accounts",
    "memberships_details_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/memberships_details",
    "open_membership_invitations_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/open_membership_invitations",
    "confirmed_email_addresses_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/confirmed_email_addresses",
    "team_owner_link": null,
    "preferred_email_address_link": "https://code.launchpad.net/api/devel/~a-dubs/+email/alec.warren@canonical.com",
    "mailing_list_auto_subscribe_policy": "Ask me when I join a team",
    "archive_link": "https://code.launchpad.net/api/devel/~a-dubs/+archive/ubuntu/my-cloud-init",
    "ppas_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/ppas",
    "sub_teams_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/sub_teams",
    "super_teams_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/super_teams",
    "members_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/members",
    "admins_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/admins",
    "participants_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/participants",
    "deactivated_members_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/deactivated_members",
    "expired_members_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/expired_members",
    "invited_members_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/invited_members",
    "members_details_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/members_details",
    "proposed_members_collection_link": "https://code.launchpad.net/api/devel/~a-dubs/proposed_members",
    "account_status_history": "tag:launchpad.net:2008:redacted",
    "http_etag": "\"7130fa51e7ad8f11e2a0b5d5a50d5d55044a7aca-a6207f5644015bbf1cfab2f9f5de9197908ea567\""
  },
  "text": "sadfsadfadsf",
  "date": "2024-05-17T09:56:19.828813+00:00"
}
  */

    let parsedComments = [];

    console.log(`parsing ${apiResponse.length} inline comments from API response`);

    apiResponse.forEach(comment => {
        [file, line_no, lineContent] = extractFileAndLineFromDiff(comment.line_number, DIFF_TEXT);
        parsedComments.push({
            originalDiffLineNum: comment.line_number,
            author: `${comment.person.display_name} (${comment.person.name})`,
            commentText: comment.text,
            commentDate: comment.date,
            file: file,
            line_no: line_no,
            lineContent: lineContent,
            previewDiffId: preview_diff_id
        });
    });

    console.log("parsed inline comments from API response:", parsedComments);
    return parsedComments;
}


function wait_for_diff_navigator_to_load() {
    console.log("waiting for diff navigator to load");
    return new Promise((resolve) => {
        const diffNavigator = document.querySelector(".diff-navigator select");
        if (diffNavigator) {
            console.log("diff navigator already loaded");
            resolve();
        } else {
            // Use the body or a more specific parent node for the observer
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach(addedNode => {
                        // Check if the added node is an element and has the right class
                        if (addedNode.nodeType === Node.ELEMENT_NODE) {
                            // Check if the addedNode or its descendants match the selector
                            if (addedNode.matches(".diff-navigator select") || 
                                addedNode.querySelector(".diff-navigator select")) {
                                console.log("diff navigator loaded");
                                observer.disconnect();
                                resolve();
                            }
                        }
                    });
                });
            });

            // Observe the document body or a more specific parent if needed
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });
}

function boardCommentHasInlineCommentAttached(boardComment) {
    // check if the board comment has an inline comment attached
    // by looking for "boardCommentDetails table td" with "data-preview-diff-id" attribute
    const details_tds = boardComment.querySelectorAll(".boardCommentDetails table td");
    for (const td of details_tds) {
        const previewDiffId = td.getAttribute("data-previewdiff-id");
        if (previewDiffId) {
            return true;
        }
    }
    return false;
}

function hideAllBoardCommmentsWithInlineComments() {
    const boardComments = document.querySelectorAll(".boardComment");
    boardComments.forEach(boardComment => {
        if (boardCommentHasInlineCommentAttached(boardComment)) {
            boardComment.style.display = "none";
        }
    });
}



function main() {
    showdown.setFlavor('github');
    hideAllBoardCommmentsWithInlineComments();
    cleanup_previous_elements()
    // find number of comments on MP
    doCiCdStuff();
    // doMarkdownCommentsStuff()
    // doCustomDiffStuff();
    document.querySelectorAll(".boardCommentBody").forEach((comment) => {
        // console.log(comment.innerText)
    });

    // waitForInlineCommentsAndFetch();


    // const newestDiffTitle = document.querySelector(".diff-navigator select").innerText;
    // console.log(newestDiffTitle);

    // JUST DEBUGING STUFF : DELETE ME
    // const diffElement = findDiffElementByFileName("junk.py");
    // console.log(diffElement);
    // const lineElement = findDiffLineElementByLineNumber(diffElement, 47);
    // console.log(lineElement);
    // console.log(extractFileAndLineFromDiff(47, DIFF_TEXT))

    // disable this and just do simple stuff with what we can from web page for now
    // fetchMPFromLPyd()

    // const test_url = "http://google.com"
    // // fetch test_url to make sure url fetching is working
    // fetch(test_url, { mode: 'cors' })
    //     .then(response => {
    //         if (!response.ok) {
    //             throw new Error('Network response was not ok');
    //         }
    //         return response.text();
    //     })
    //     .then(data => {
    //         // Handle the response data here
    //         console.log(data);
    //     })
    //     .catch(error => {
    //         // Handle errors here
    //         console.error('There was a problem with the fetch operation:', error);
    //     });
    

    // disabling calling this from here for now.
    // doCustomDiffStuff();
    
    // whenever .diff-content changes, call fetchInlineComments and doCustomDiffStuff
    const diffContent = document.querySelector(".diff-content");
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            console.log(".diff-content mutation observed")
            parseDiffTextFromExistingDiv();
            doCustomDiffStuff();
            add_inline_comments_to_custom_diff();
        });
    });
    observer.observe(diffContent, { childList: true, subtree: false });


    wait_for_diff_navigator_to_load().then(() => {
        console.log("diff navigator loaded");
        doCustomDiffStuff();
        fetchInlineComments();
    });

}

if (document.readyState === "complete" || document.readyState === "interactive") {
    console.log("document already loaded")
    main()
}
else {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOMContentLoaded")
        main()
    });
}

// How to implement persistent settings:
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Implement_a_settings_page