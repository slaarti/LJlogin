# LJlogin

**NOTE: THIS PROJECT IS NOW DEFUNCT. PLEASE DO NOT ASK ME FOR HELP OR TO
RESUME THE PROJECT.**

## The Original Premise

Are you a Firefox user with multiple LiveJournal accounts (whether for
roleplaying or other purposes)? Weary of constantly having to go back to
the login page to switch accounts, especially if you forget and do
something while logged into the wrong one? Well, now you're in luck,
because LJlogin will help you by showing you who you're logged in as and
-- if you use Firefox's Password Manager -- allowing you to switch between
them.

## Abandonment

The last update to LJlogin was in 2011. Five years later, I finally
accepted that I'm just never going to get it together to pick up
development of it again, especially since I don't really use any sites
that use LiveJournal code anymore, especially not for roleplaying
(probably the primary use case for needing multiple account support).

So, in 2016, I finally moved the project from my own site (and Subversion,
for that matter) to GitHub here, to have somewhere I don't have to manage
to retire it to.

## So You're Planning on Forking This Project

In the process of moving this project to GitHub, I've culled some things
out that, in my opinion, are particular to the project as I was
responsible for it. I did not try to go through all of the past commits
and edit history; I merely committed new changes to `master`. Please
provide your own values for these things instead of going back and finding
the old values.

Removals / Changes:

*   From `install.rdf`:
    *   Both instances of `em:id`
    *   The `em:updateKey`, since you wouldn't really be able to sign your
        packages without my private half anyway.
    *   The `em:homepageURL` and `updateURL`, since neither of those is
        valid anymore anyway. Actually, I've change the homepage URL to
        the GitHub project. If you're going to develop from a fork, you
        should probably change that to your own project URL.
    *   I'm leaving `em:creator` as-is; I leave it to you and your
        conscience to decide how you want to handle how much credit you
        give me as original developer vs. yourself as the person picking
        up the code.
*   ...Actually, that's it. You may wish I'd culled out all of my terrible
    code, but sorry, no, that stays unless you do something about it.

Also, reflecting the fact that this project is defunct and abandoned,
I will not be accepting help or pull requests. I'm sorry, but please don't
even try.
