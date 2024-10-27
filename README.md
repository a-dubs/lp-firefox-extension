# Launchpad Enhanced Diff Viewer Firefox Extension

![Static Badge](https://img.shields.io/badge/version-v0.3.0-orange)

This Firefox extension enhances the code review experience on Launchpad by introducing several improvements similar to GitHub's diff viewing capabilities. It utilizes the `diff2html` library to render diffs in a more readable and user-friendly format. Key features include:

- **GitHub-like Diff Viewing:** Transform the standard diff presentation into a more intuitive and visually appealing format.
- **Markdown Rendering in Comments:** Converts plain text comments to Markdown, making them more readable and organized.
- **CI/CD Status Integration:** Displays the most recent CI/CD status directly in the merge proposal summary.
- **Inline Comments Enhancement:** Improves the visibility and interaction with inline comments.
- **Diff View Customization:** Allows users to switch between unified and side-by-side diff views.
- **Collapsible File Diffs:** Users can collapse or expand file diffs to focus on changes that matter.
- **Easily Checkout MP Locally:** At the top of an MP, under the status info, you will find a button that will copy the
  full set of commands to checkout the MP locally that can be run from the terminal inside the project directory
  (assuming you already have the project cloned).
- **Markdown Rendering:** Comments are rendered in Markdown format, making them more readable and organized.
- **Improved Inline Comments:** Inline comments can now be added from the custom diff viewer, and have built-in
  Markdown support.
- **Post Individual Inline Comments:** Inline comments can now be posted individually, without having to post all
  comments at once or manually leave a comment on the MP.
- **Outdated Inline Comments Shown in Timeline:** When viewing an MP, inline comments from outdated diffs are shown in
  the timeline and can be easily replied to. No more having to switch between diffs to see old comments.

## Installation

1. Go to the [releases page](https://github.com/a-dubs/lp-firefox-extension/releases/) and download the latest `.xpi`
   file.
2. Open Firefox and navigate to `about:addons`.
3. Click on the gear icon in the top-right corner and select "Install Add-on From File..."
4. Choose the `.xpi` file you downloaded and follow the prompts to install the extension.
5. Go to https://github.com/a-dubs/launchpad-microservice and follow the instructions to install and setup the
   microservice that will run on your local machine. This is necessary for posting comments.
6. Profit 🚀

## Usage

After installation, the extension automatically activates when you visit a diff page on Launchpad. No additional setup is required. Here are some ways to interact with the enhanced features:

- **Switch Diff View:** Use the "View as side-by-side" or "View as unified" button at the top of the diff to toggle between diff views.
- **Collapse/Expand Files:** Click on the "Collapse" or "Expand" button next to each file name in the diff to manage your view of changes.
- **Access Inline Comments:** Inline comments are displayed directly below the relevant line in the diff. Click on gutter numbers to add new inline comments.
- **View CI/CD Status:** The CI/CD status is visible at the top of the merge proposal summary, providing a quick
  overview of the build status.


## Contributing

Contributions to improve the extension or add new features are welcome. Please submit pull requests or open issues with your suggestions and feedback.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---
