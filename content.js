// content.js
// import "lib/marked.min.js";
console.log("LP Firefox extension loaded")

// test pages:
// https://code.launchpad.net/~a-dubs/cloudware/+git/oraclelib/+merge/455155
// https://code.launchpad.net/~gjolly/cloudware/+git/cinteract/+merge/461516

var DIFF_TEXT = "";
var MP = {};

////////// LPyd Types //////////
// @dataclasses.dataclass
// class InlineCommentMessageType:
//     author_username: str
//     author_display_name: str
//     message: str
//     date: str


// @dataclasses.dataclass
// class InlineCommentType:
//     file: str
//     line_no: int
//     messages: List[InlineCommentMessageType]


// @dataclasses.dataclass
// class MergeProposalCommentType:
//     id: str
//     self_link: str
//     author_username: str
//     message: str
//     date_created: str
//     date_last_edited: Optional[str] = None


// @dataclasses.dataclass
// class DiffPerFileInfoType:
//     file: str
//     lines_added: int
//     lines_deleted: int
//     status: Literal["new file", "deleted file", "modified"] = "modified"
//     diff_text_snippet: Optional[str] = None
//     original_file_contents: Optional[str] = None


// @dataclasses.dataclass
// class DiffType:
//     id: int
//     title: str
//     self_link: str
//     date_created: str
//     source_revision_id: str
//     target_revision_id: str
//     diff_per_file_info: List[DiffPerFileInfoType] = dataclasses.field(default_factory=list)
//     inline_comments: List[InlineCommentType] = dataclasses.field(default_factory=list)
//     diff_text: Optional[str] = None


// @dataclasses.dataclass
// class MergeProposalReviewVote:
//     reviewer_username: str
//     reviewer_display_name: str
//     vote: Optional[
//         Literal["APPROVE", "NEEDS_FIXING", "NEEDS_INFO", "ABSTAIN", "DISAPPROVE", "NEEDS_RESUBMITTING"]
//     ] = None
//     needs_reviewer: bool = False


// @dataclasses.dataclass
// class MergeProposalType:
//     id: int
//     self_link: str
//     repo_name: str
//     url: str
//     source_git_url: str
//     target_git_url: str
//     source_branch: str
//     target_branch: str
//     source_owner: str
//     target_owner: str
//     review_state: str
//     diffs: List[DiffType] = dataclasses.field(default_factory=list)
//     description: Optional[str] = None
//     commit_message: Optional[str] = None
//     ci_cd_status: Literal["PASSING", "FAILING", "UNKNOWN"] = "UNKNOWN"
//     comments: List[MergeProposalCommentType] = dataclasses.field(default_factory=list)
//     review_votes: List[MergeProposalReviewVote] = dataclasses.field(default_factory=list)


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
    const comments = document.querySelectorAll("#conversation .boardComment")
    console.log(`number of comments: ${comments.length}`)
    var most_recent_ci_cd_state = "";
    var most_recent_ci_cd_job_link = "";
    // const most_recent_ci_cd_state
    comments.forEach(comment => {
        const user_link = comment.querySelector(".boardCommentDetails a.person")
        if (user_link) {
            if (user_link.innerText === "CPC CI Bot (cpc-ci-bot)") {
                most_recent_ci_cd_state = parseCICDState(comment)
                most_recent_ci_cd_job_link = comment.querySelector(".boardCommentBody a").href
                // comment.remove()
                comment.style.display = "none";
            }
        }
        else {
            console.log(comment.querySelector(".boardCommentDetails"))
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

    commentContainer.appendChild(commentElement);
}


function insertNewInlineCommentWrapperBelowRow(tr_element, line_no) {

    const commentWrapperRow = document.createElement("tr");
    commentWrapperRow.classList.add("d2h-inline-comment-row");
    commentWrapperRow.id = `d2h-inline-comment-line-${line_no}`;

    const commentContainer = document.createElement("td");
    commentContainer.classList.add("d2h-inline-comment-container");
    commentContainer.setAttribute('colspan', '2');
    
    commentWrapperRow.appendChild(commentContainer);
    
    // insert after the tr element
    tr_element.insertAdjacentElement("afterend", commentWrapperRow);
}

function createOrUpdateInlineComment(LPyd_inline_comment_thread) {
    // find the file diff that matches the comment's file
    const line_no = LPyd_inline_comment_thread.line_no;
    const file_diff = findDiffElementByFileName(LPyd_inline_comment_thread.file);
    if (file_diff) {
        const lineElement = findDiffLineElementByLineNumber(file_diff, line_no);
        if (lineElement) {
            // if (document.querySelector(".d2h-inline-comment-row"))
            const existingComment = document.querySelector(`#d2h-inline-comment-line-${line_no}`);
            if (!existingComment) {
                insertNewInlineCommentWrapperBelowRow(
                    lineElement,
                    line_no,
                );
            }
            const targetInlineCommentWrapper = document.querySelector(`#d2h-inline-comment-line-${line_no}`);
            // console.log("comment already exists for line " + LPyd_inline_comment_thread.line_no)
            const commentContainer = targetInlineCommentWrapper.querySelector(".d2h-inline-comment-container");
            LPyd_inline_comment_thread.messages.forEach(message => {
                commentContainer.appendChild(createInlineCommentElement(
                    message.author_username,
                    message.author_display_name,
                    message.message,
                    message.date,
                ));
            });
            // }
            // else {
            //     LPyd_inline_comment_thread.messages.forEach(message => {
            //         insertInlineCommentElementBelowLine(lineElement, createInlineCommentElement(message), line_no);
            //     });
            // }
        }
    }
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
    console.log("finding diff line element by line number " + lineNumber + " using diff element:")
    console.log(diffElement)
    const tableRows = diffElement.querySelectorAll("tr");
    for (const row of tableRows) {
        if (row.querySelector(".d2h-code-linenumber")) {
            if (parseInt(row.querySelector(".d2h-code-linenumber").innerText) === lineNumber) {
                return row;
            }
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
        if (line.querySelector(".d2h-code-linenumber")) {
            if (parseInt(line.querySelector(".d2h-code-linenumber").innerText) === lineNumber) {
                targetLineIndex = index;
            }
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

function createInlineCommentElement(username, display_name, message, date) {
    console.log(`createInlineCommentElement given: ${username}, ${display_name}, ${message}, ${date}`)
    // console.log("creating inline comment element for comment: " + commentInfo.commentText)
    const header = document.createElement("div");
    header.classList.add("d2h-inline-comment-header");
    header.innerText = display_name + " (@" + username + ") commented on " + date + ":";

    const body = document.createElement("div");
    body.classList.add("d2h-inline-comment-body");
    converter = new showdown.Converter();
    body.innerHTML = converter.makeHtml(message);

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

// function fetchInlineComments() {
//    //     // 
//     parsed_comments.forEach(parsed_comment => {
//         // console.log(parsed_comment)
//         // find the file diff that matches the comment's file
//         file_diffs.forEach(file_diff => {
//             const file_name = file_diff.querySelector(".d2h-file-name").innerText;
//             if (file_name === parsed_comment.file) {
//                 // TODO: move the gutter finding and insertion logic elsewhere to make adding multiple 
//                 // comments to the same line easier
//                 const gutters = file_diff.querySelectorAll(".d2h-code-side-linenumber , .d2h-code-linenumber");
//                 var target_gutter = null;

//                 // find all gutters with the same line number as the comment using the innerText
//                 gutters.forEach(element => {
//                     if (parseInt(element.innerText) === parsed_comment.line_no) {
//                         target_gutter = element;
//                     }
//                 });
//                 // console.log(target_gutter)
//                 if (target_gutter) {
//                     insertInlineCommentElementBelowLine(target_gutter.parentElement, createInlineCommentElement(parsed_comment), parsed_comment.line_no);
//                 }
//             }
//         });
//     });
// }

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
            const line_no = parseInt(tr_element.querySelector(".d2h-code-linenumber").innerText);
            const existingComment = document.querySelector(`#d2h-inline-comment-line-${line_no}`);
            if (!existingComment) {
                insertNewInlineCommentWrapperBelowRow(
                    lineElement,
                    line_no,
                );
            }
            const targetInlineCommentWrapper = document.querySelector(`#d2h-inline-comment-line-${line_no}`);
            createNewEditableInlineComment(tr_element);
        });
    });

    const inline_comments = MP["diffs"][0]["inline_comments"];
    console.log(inline_comments);
    console.log("INSERTING INLINE COMMENTS")
    inline_comments.forEach(LPyd_inline_comment_thread => {
        createOrUpdateInlineComment(LPyd_inline_comment_thread);
    });
    console.log("DONE INSERTING INLINE COMMENTS")
    console.log("INSERTING CODE COMMENT CARDS")
    createCodeCommentCards(inline_comments);
    console.log("DONE INSERTING CODE COMMENT CARDS")
}

// create a new card that contains X number of lines before the target line number
function createCodeCommentCards(LPyd_inline_comment_threads) {
    // groupedComments.forEach(fileName => {
    console.log(LPyd_inline_comment_threads)
    LPyd_inline_comment_threads.forEach(comment_thread => {
        console.log(comment_thread)
        console.log(`comment_thread.file: ${comment_thread.file}`)
        console.log(`comment_thread.line_no: ${comment_thread.line_no}`)
        const commentCard = document.createElement("div");
        commentCard.classList.add("d2h-code-comment-card");
        const header = document.createElement("div");
        header.classList.add("d2h-code-comment-card-header");
        const fileName = document.createElement("h3");
        fileName.innerText = comment_thread.file;
        const diffTable = document.createElement("table");
        diffTable.classList.add("d2h-diff-table");
        const diffTbody = document.createElement("tbody");
        diffTbody.classList.add("d2h-diff-tbody");
        const commentsContainer = document.createElement("div");
        commentsContainer.classList.add("d2h-code-comment-card-comments-container");

        commentCard.appendChild(header);
        commentCard.appendChild(diffTable);


        const diffLines = getLinesAroundTargetLine(comment_thread.file, comment_thread.line_no, 4, 0);
        // copy the diff lines into the diffTbody
        diffLines.forEach(line => {
            const clonedLine = line.cloneNode(true); // clone the line element
            diffTbody.appendChild(clonedLine); // append the cloned line element
        });
        diffTable.appendChild(diffTbody);


        // append comments 
        comment_thread["messages"].forEach(comment_message => {
            commentsContainer.appendChild(
                createInlineCommentElement(
                    username = comment_message.author_username,
                    display_name = comment_message.author_display_name,
                    message = comment_message.message,
                    date = comment_message.date,
                )
            );
        });
        commentCard.appendChild(commentsContainer);

        // insert the comment card into the "#conversation" div
        document.querySelector("#conversation").appendChild(commentCard);


    });
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
            console.log(data);
            console.log(MP);
            doInlineCommentsStuff();
        })
        .catch(error => {
            // Handle errors here
            console.error('There was a problem with the fetch operation:', error);
        });

}


function main() {
    showdown.setFlavor('github');
    cleanup_previous_elements()
    // find number of comments on MP
    doCiCdStuff();
    // doMarkdownCommentsStuff()
    doCustomDiffStuff();
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
    // fetchInlineComments()
    // console.log(extractFileAndLineFromDiff(47, DIFF_TEXT))

    fetchMPFromLPyd()

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