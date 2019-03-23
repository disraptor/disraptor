# Disraptor: Limitations for documents and resources

Disraptor can only operate reliably while imposing restrictions on its documents and resources.



## List of restrictions

- [URL paths **must not** be file-relative](#url-paths-must-not-be-file-relative)
- [HTML IDs, class names and custom attributes **should** be prefixed](#html-ids-class-names-and-custom-attributes-should-be-prefixed)
- [Stylesheets and scripts **must not** select or query DOM nodes outside of a Disraptor document](#stylesheets-and-scripts-must-not-select-or-query-dom-nodes-outside-of-a-disraptor-document)



## URL paths must not be file-relative

URL paths in scripts and stylesheets **must not** be file-relative. Disraptor is **not** able to resolve the following reference reliably:

```css
body {
  background-image: url("tiled-background.jpg");
}
```

Instead, use root-relative URL paths (or absolute URLs).

```css
body {
  background-image: url("/img/tiled-background.jpg");
}
```

### Explanation

URL references in Disraptor documents and resources must either be absolute or root-relative. The correct context of file-relative URLs cannot be recovered; hence, they must be avoided.

In the following example, two routes are specified. One for a document (`/example → http://localhost:8080/`); one for stylesheets (`/css/* → http://localhost:8080/css/*`). In the example document, there is a reference to the stylesheet `/css/styles.css`:

**`http://localhost:8080/`**:

```html
<link rel="stylesheet" href="/css/styles.css">
```

The stylesheet contains the following styles of URL references: absolute, root-relative and file-relative.

**`http://localhost:8080/css/styles.css`**:

```css
@import "http://localhost:8080/css/base.css";
@import "/css/colors.css";
@import "typography.css";
```

The first two styles (absolute and root-relative URLs) can always be resolved correctly. The root-relative URL will recover its context via its route and resolve to `http://localhost:8080/css/colors.css`.

The third style (a file-relative URL) causes an issue. This will not match any Disraptor route because a Disraptor route has to begin with a slash: It’s always root-relative to the Discourse instance. Therefore, the last reference will resolve to `typography.css` (note the missing `http://localhost:8080/`), potentially pointing to a resource on the Discourse instance or to a non-existing object. It’s not possible for Disraptor to recover the original context of this reference without looking at the content of each document or resource at the language level.

For this reason, file-relative URLs must not be used in Disraptor applications. Every URL reference in your stylesheets and scripts has to be absolute or root-relative.



## HTML IDs, class names and custom attributes should be prefixed

**Note**: This limitation only applies *to stylesheets* when using the legacy rendering mode. The shadow DOM rendering mode achieves style isolation and avoids these conflicts.

HTML IDs, classes and custom attributes **should** be prefixed to avoid conflicts with Discourse. Following this limitation avoids styles from leaking out of the Disraptor document into the surrounding Discourse document. It also avoids Discourse accidentally selecting or querying DOM nodes by ID, class name or custom attribute that are part of the Disraptor document.

The following CSS **will** conflict with Discourse’s button styles and affect not only the Disraptor document but also the surrounding Discourse document.

```css
.btn {
  outline: 2px solid red;
}

[data-attr] {
 /* … */
}
```

Instead, prefix IDs, class names, and custom attributes.

```css
.app-btn {
  outline: 2px solid red;
}

[data-app-attr] {
 /* … */
}
```



## Stylesheets and scripts must not select or query DOM nodes outside of a Disraptor document

Stylesheets and scripts **must not** select or query DOM nodes outside of a Disraptor document. Following this limitation avoids styles from leaking from the Discourse document into the containing Disraptor document. It also avoids Disraptor accidentally selecting or querying DOM nodes by ID, class name or custom attribute that are part of the Discourse document.

This limitation **may** be intentionally ignored **if** one wants to make use of Discourse functionality or styles (e.g. styling buttons the same way Discourse does).
