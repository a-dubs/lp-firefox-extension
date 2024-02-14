// content.js
// import "lib/marked.min.js";
console.log("LP Firefox extension loaded")

// test page:
// https://code.launchpad.net/~a-dubs/cloudware/+git/oraclelib/+merge/455155

var DIFF_TEXT = "";

function cleanup_previous_elements() {
    console.log("cleaning up previous elements")
    // remove elements that may have been injected at a previous time
    if (document.querySelector("#ci_cd_status_row")) {
        document.querySelector("#ci_cd_status_row").remove()
    }
    if (document.querySelector("#custom-diff-area")) {
        document.querySelector("#custom-diff-area").remove()
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
        // insert new diff viewer div into customDiffArea
        customDiffArea.appendChild(diffViewer)
        // insert customDiffArea before old diff area that we're replacing
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

function createInlineCommentElement(commentInfo) {
    console.log("creating inline comment element for comment: " + commentInfo.commentText)
    const header = document.createElement("div");
    header.classList.add("d2h-inline-comment-header");
    header.innerText = commentInfo.author + " commented on " + commentInfo.commentDate + ":";
    
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
    const width = document.querySelector(".d2h-code-wrapper").offsetWidth;
    // subtract 2 for border width and 20 for padding and 40 for margin
    customCommentElement.style.width = (width - 2 - 20 - 40) + "px";
    
    // add listener to resize the comment element when the window is resized
    window.addEventListener('resize', () => {
        const width = document.querySelector(".d2h-code-wrapper").offsetWidth;
        document.querySelector(".d2h-inline-comment").style.width = (width - 2 - 20 - 40) + "px";
    });

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


function fetchInlineComments() {
    console.log("fetching inline comments")
    // #review-diff .boardComment is the actual inline comment element
    // but #review-diff .inline-comment is for a single inline comments and .inline-comments is for an inline comment
    // thread

    // for now, get only single inline comments
    const inlineCommentsWrappers = document.querySelectorAll(".diff-content .inline-comments");
    // get diff line number from the element's id in the format "comments-diff-line-47"
    // create dict with keys of line number, author, comment_text, comment_date, file, and line content
    var parsed_comments = [];
    inlineCommentsWrappers.forEach(commentWrapper => {
        const comments = commentWrapper.querySelectorAll(".boardComment");
        const lineNum = commentWrapper.id.split("-")[3];
        const [file, line_no, lineContent] = extractFileAndLineFromDiff(parseInt(lineNum), DIFF_TEXT);
        comments.forEach(comment => {
            // console.log(comment)
            const details = comment.querySelector(".boardCommentDetails").innerText;
            const author = details.split(" wrote on ")[0];
            const commentDate = details.split(" wrote on ")[1].replace(":", "");
            const commentText = comment.querySelector(".boardCommentBody").innerText;
            // const commentDate = comment.querySelector(".boardCommentActivity").innerText;
            parsed_comments.push({
                originalDiffLineNum: lineNum,
                author: author,
                commentText: commentText,
                commentDate: commentDate,
                file: file,
                line_no: line_no,
                lineContent: lineContent
            });
        });
    });

    // console

    // gutter class is ".d2h-code-side-linenumber" for side-by-side view and ".d2h-code-linenumber" for unified view 
    // get all gutters 

    const file_diffs = document.querySelectorAll(".d2h-file-wrapper");

    console.log(parsed_comments)

    // 
    parsed_comments.forEach(parsed_comment => {
        console.log(parsed_comment)
        // find the file diff that matches the comment's file
        file_diffs.forEach(file_diff => {
            const file_name = file_diff.querySelector(".d2h-file-name").innerText;
            if (file_name === parsed_comment.file) {
                // TODO: move the gutter finding and insertion logic elsewhere to make adding multiple 
                // comments to the same line easier
                const gutters = file_diff.querySelectorAll(".d2h-code-side-linenumber , .d2h-code-linenumber");
                var target_gutter = null;
                
                // find all gutters with the same line number as the comment using the innerText
                gutters.forEach(element => {
                    if (parseInt(element.innerText) === parsed_comment.line_no) {
                        target_gutter = element;
                    }
                });
                console.log(target_gutter)
                if (target_gutter) {
                    insertInlineCommentElementBelowLine(target_gutter.parentElement, createInlineCommentElement(parsed_comment), parsed_comment.line_no);
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
            insertInlineCommentElementBelowLine(tr_element);
        });
    });



}

function main() {



    // console.log("main")
    showdown.setFlavor('github');
    cleanup_previous_elements()

    doMarkdownCommentsStuff()
    doCiCdStuff();
    doCustomDiffStuff();
    doInlineCommentsStuff();
    document.querySelectorAll(".boardCommentBody").forEach((comment) => {
        // console.log(comment.innerText)

    });

    // wait 200ms for the inline comments to load
    // do this 10 times then give up
    var attempts = 0;
    var interval = setInterval(() => {
        attempts++;
        console.log("attempting to fetch inline comments")
        const inlineComments = document.querySelectorAll(".diff-content .inline-comments");
        if (inlineComments.length > 0) {
            console.log("inline comments found!")
            clearInterval(interval);
            fetchInlineComments();
        }
        if (attempts >= 20) {
            console.log("giving up on inline comments")
            clearInterval(interval);
        }
    }, 250);
    

    
    
    // fetchInlineComments()
    console.log(extractFileAndLineFromDiff(47, DIFF_TEXT))
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