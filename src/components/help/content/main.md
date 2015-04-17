The namespace browser is a tool to browse Vanadium namespaces
and interact with Vanadium services.
See the [Vanadium documentation](http://v.io) for more information.

Names
-----

Vanadium names identify objects in a namespace (similar to how URLs identify
objects on the web). In Vanadium, the objects are all *services* on *servers*.

Names in Vanadium are a sequence of simple names separated by slashes (/)
(see [the Naming concepts document](https://v.io/concepts/naming.html) for more information).
The process of using a Vanadium name to find a service on a server is
called *name resolution*. A name is resolved by special servers called
*mount tables*, and (optionally) by the servers themselves using something
called a *dispatcher*.
Names are resolved from left to right.

For example, the Vanadium name `User/jane/images/vacation/42.jpg`
could be used to access a photo on an image storage server.
One or more mount tables would be traversed to find the `images` server,
whose dispatcher would then be used to find the `vacation` photo named `42.jpg`.
A *method* can then be called on this object; for example,
`User/jane/images/vacation/42.jpg.Get()` might return the image
(or `Delete()` might delete it).

Mount Tables
------------

A *mount table* is a kind of Vanadium server used to find other services.
A mount table contains a set of *mount points*, which map names to distributed
pointers to other services (including to other mount tables).
An interconnected set of mount tables forms a Vanadium *namespace*.

Like any Vanadium server, a mount table has a dispatcher that is
used to help resolve names. In the above example the name
`User/jane/images` may have been created in more than one way.
For example, `User` could resolve to a mount table that
contains a mount point named `jane`. This mount point could then point
to another mount table that contains a mount point named `images`.

![two mount tables](helpimg/name2.png)

Alternatively, the `User` mount table could contain a mount point named
`jane/images`, which points directly to the image store server.
Even though the name `jane/images` contains a slash, it is resolved by the mount
table dispatcher to a single mount point.

![single mount table](helpimg/name1.png)

Another way to think about this is that a mount table can contain *subtables*,
so `User/jane` names a subtable in the `User` mount table. These subtables
can be used to group objects together (like directories in a file system on a computer).

Note that even though Vanadium names look hierarchical, namespaces can
(and often do) contain cycles. A mount table could even contain a mount point
that points directly to the same mount table.

Rooted and Relative Names
-------------------------

Names in Vanadium can either be *rooted* or *relative*.
A rooted name begins with a slash (/), while a relative name does not.

Rooted Names
------------

The name following the (required) initial slash of a rooted name is the *root*,
and always points to a service (typically a mount table).
A root is specified in one of three ways:
1. using a (DNS) domain name (typically with an optional port number),
like "ns.dev.v.io:8101" or "localhost:5167",
2. using an IP address (also with an optional port number), like "127.0.0.1:5167"
(note that the IP address can use either IPv4 or IPv6 format),
3. or a Vanadium endpoint address for a mount table, which looks something like
"@3@@batman.com:2345@00000000000000000000000000000000@2@3@s@@".

Relative Names
--------------

A relative name does not begin with a slash.
The meaning of a relative name depends on a root stored in the user's environment
(this is similar to the concept of a "current directory", except it can
be on a different device).

For example, each user can have their own mount table where they store things
they own. This mount table can contain names like "phone/messages" that
could be used to access the messages on their mobile phone.
Different users (or devices) would normally have a different default root,
so they would access their own messages.

Identity
--------

In Vanadium, mount tables (and thus names) are by default secure.
What names are accessible to a user depend on the identity of the user, and
the services (including mount tables) to which the user has been given access.

Help Topics
-----------

* [What You See](#/help/details) –
the different parts of the namespace browser and what they do.

* [Browse](#/help/browse) – how to browse a namespace,
including the different views provided by the namespace browser.

* [Invoking Services](#/help/methods) – once you browse to a service,
how to invoke methods.

* [FAQ](#/help/faq) – answers to frequently asked questions.
<p>&nbsp;</p>
