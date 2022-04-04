# Scouting Webapp

A webapp for FRC scouting...

I added a backend to the blue alliance api using a port of an npm library. This code is not deployable, I made every form field optional to speed up testing. In the form.js, I did a simple automation where it autogets the team name, and end game. To add more data points take a look at the score breakdown in the match data array, it has a lot of info. There is also support for arbitrary api calls, look at the library. Also make sure to add an api key, you can get one by creating a blue alliance account.

## Backend

The provided PHP backend is merely an example. You can use your own google form backend (read the MD file in /backend), use the provided PHP, or use your own system. In the PHP form, security is provided through the form key validation. I would use PHPLiteAdmin for access.
