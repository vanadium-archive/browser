Introduction
------------

The Viz Vanadium Viewer is a tool to browse and interact with Vanadium services.
See the [Vanadium documentation](http://staging.v.io) for more information.

Mount Tables
------------

One special kind of Vanadium service is a *mount table*, which contains
distributed pointers to other services (including other mount tables).
Each item in a mount table can be one of three things:
* a distributed pointer to another mount table
* a distributed pointer to a Vanadium service (other than a mount table)
* a folder (intermediary name)

<br />Folders are used to group items together, like in a file system
on a computer.
The name used to identify a folder is called an "intermediary name" (like
a directory name). Folders in a mount table can only contain other items
in the same mount table.

Namespaces
----------

An interconnected set of mount tables forms a Vanadium *namespace*.

Vanadium uses namespaces to find things (services), somewhat like how the WWW
uses URLs to find things (web pages).

Names
-----

Names in Vanadium are a sequence of simple names separated by slashes (/)
(see https://v.io/docs/core-concepts/naming.html for more information).

Names in Vanadium can either be *rooted* or *relative*.

Rooted Names
------------

A rooted name begins with a slash (/), while a relative name does not.
The name following the initial slash of a rooted name is the *root*.
A root can be specified three ways:
1. using a domain name (with an optional port number), like "v.io:8101"
or "localhost:5167",
2. using an IP address (with an optional port number), like "127.0.0.1:5167",
3. or a Vanadium endpoint for a mount table, like
"@3@@batman.com:2345@00000000000000000000000000000000@2@3@s@@".

Relative Names
--------------

A relative name does not begin with a slash.
The meaning of a relative name depends on a root stored in your environment
(this is similar to the concept of a "current directory", except it can
be on a different device).

For example, a user can have their own mount table where they store things
they own. This mount table can contain names like "phone/messages" that
could be used to access the messages on their mobile phone.
Different users (or devices) would normally have a different default root,
so they would access their own messages.

Identity
--------

In Vanadium, mount tables (and thus names) are secure.
What names are accessible to a user depend on the identity of the user, and
the services (including mount tables) to which the user has been given access.

Help Topics
-----------

* [What You See](#/help/details) – the different parts of Viz and what they do.

* [Browse](#/help/browse) – how to use Viz to browse a namespace,
including the different views provided by Viz.

* [Invoking Services](#/help/methods) – once you browse to a service,
how to invoke methods.

* [FAQ](#/help/faq) – answers to frequently asked questions.
