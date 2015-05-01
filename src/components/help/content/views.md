![The Namespace Browser](helpimg/views.png)

When you first open the namespace browser it has four main areas.
At the very top is the header (in cyan)
and immediately below it is the toolbar (in light gray).

In Browse mode, the remainder of the page is divided into two panes.
The left pane shows the view of the namespace for you to browse.
If you select an item in the left pane, the right pane shows details
about that item and (if it is a service) lets you call methods on it.

Header
------

![Header](helpimg/header.png)

Starting from the left, the header contains a widget
![menu icon](helpimg/menuicon.png)
to bring up a menu drawer for changing modes.
The current mode (in this case, Browse) is displayed next.
There are other modes for starting the [Sample World Demo](#/help/sample),
viewing the Help pages, and submitting bugs/suggestions.

In Browse mode, the header also shows the Vanadium name being used
as the root of the current view.
You can type an arbitrary Vanadium name into this field to browse it.
(For additional ways to change the root of the view, see the next section
on the toolbar).
If this field is empty, it defaults to the Home mount table for the
current environment (the root of relative names).

For example, type in "/ns.dev.v.io:8101/identity" to this field (and hit return)
to set the identity mount point to be the root of the current view.
Also clear out this field (and hit return) to see what happens.
Can you tell what your default root is for relative names?

The icon
![reload icon](helpimg/reload.png)
in front of this name is used to reload the browser.
The Namespace Browser does not automatically update when namespaces
change (because they may be distributed across remote machines).

Finally, on the right side of the header is a widget
![user account](helpimg/usericon.png)
for the current identity.
Hover over this widget to see the account name for the current user.
This is by default the identity used to sign into the web browser
running the Namespace Browser webapp.

Toolbar
-------

![Toolbar](helpimg/toolbar.png)

The left side of the toolbar contains three icons for the views
shown in the left pane:
1. Tree view (selected) shows items in a hierarchical tree.
2. Radial view shows a visualization of the namespace,
good for getting an overview.
3. Grid view shows items as individual objects.
<br /><br />

Next is a list of (slash separated) names showing
what is being browsed, commonly called "breadcrumbs".
The breadcrumbs start with the root name (for rooted names),
and end at the currently selected node (if any).

In the above figure, the breadcrumbs show three names:
1. `ns.dev.v.io:8101` is the root name (in grey).
2. `identity` is the root of the current view.
3. `role` is the currently selected item.
<br /><br />

The first breadcrumb shown in black (`identity`) is the root of the current view.
You can click on any name in the breadcrumbs to change the root of the current
view, which makes it easy to navigate up and down a Vanadium name.

Next there are two icons for Bookmarks
![bookmarks](helpimg/bookmarks.png)
and Recent
![recent](helpimg/recent.png).

The bookmarks icon shows a set of bookmarked items.
You can set a bookmark for any item so you can access it quickly in the future.

Recent shows items you have browsed recently.

Lastly, you can use glob syntax to search for items.
For example, you are in a namespace that represents a house.
Under the house namespace are a number of rooms
(bedroom, kitchen, living room, etc.) and under each room are things like
lights, smoke detectors, thermostats, and speakers.
To search for the lights in all rooms, you could search for "*/lights".
Note that each glob (asterisk) only matches a single level in names.
<p>&nbsp;</p>
