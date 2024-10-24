# Launchpad Enhanced Diff Viewer Firefox Extension

![Static Badge](https://img.shields.io/badge/version-v0.1.0-orange)

This Firefox extension enhances the code review experience on Launchpad by introducing several improvements similar to GitHub's diff viewing capabilities. It utilizes the `diff2html` library to render diffs in a more readable and user-friendly format. Key features include:

- **GitHub-like Diff Viewing:** Transform the standard diff presentation into a more intuitive and visually appealing format.
- **Markdown Rendering in Comments:** Converts plain text comments to Markdown, making them more readable and organized.
- **CI/CD Status Integration:** Displays the most recent CI/CD status directly in the merge proposal summary.
- **Inline Comments Enhancement:** Improves the visibility and interaction with inline comments.
- **Diff View Customization:** Allows users to switch between unified and side-by-side diff views.
- **Collapsible File Diffs:** Users can collapse or expand file diffs to focus on changes that matter.

## Installation

1. Clone or download this repository to your local machine.
2. Open Firefox and navigate to `about:debugging`.
3. Click on "This Firefox" (or "Load Temporary Add-on" in older versions).
4. Navigate to the directory where you downloaded the extension and select the `manifest.json` file.

## Usage

After installation, the extension automatically activates when you visit a diff page on Launchpad. No additional setup is required. Here are some ways to interact with the enhanced features:

- **Switch Diff View:** Use the "View as side-by-side" or "View as unified" button at the top of the diff to toggle between diff views.
- **Collapse/Expand Files:** Click on the "Collapse" or "Expand" button next to each file name in the diff to manage your view of changes.
- **Access Inline Comments:** Inline comments are displayed directly below the relevant line in the diff. Click on gutter numbers to add new inline comments.
- **View CI/CD Status:** The CI/CD status is visible at the top of the merge proposal summary, providing a quick overview of the build status.

## Contributing

Contributions to improve the extension or add new features are welcome. Please submit pull requests or open issues with your suggestions and feedback.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---
