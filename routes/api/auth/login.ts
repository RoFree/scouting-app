import express from "express";
import * as sqlite3 from "sqlite3";
import { parse } from "qs";
import { createHash, randomBytes } from "crypto";

type loginDataForm = {
    "email": string,
    "password": string
}

type authData = {
    "id": number,
    "fullName": string,
    "passHash": string,
    "accessOk": string,
    "admin": string
}

export async function checkLogIn(req: express.Request, res: express.Response, authDb: sqlite3.Database) {
    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", async () => {
        let loginData: loginDataForm = parse(body) as unknown as loginDataForm;
        authDb.get("SELECT id, fullName, passHash, accessOk, admin FROM users WHERE email=?", [loginData.email], (err: any, result: authData | undefined) => {
            if (err) {
                // res.status(500).send("" + 0x1f42);
                return res.redirect("/login?err=0");
            } else {
                if (typeof result !== "undefined") {
                    if (result.accessOk === "false") {
                        // res.status(403).send("" + 0x1932 + " account not yet approved for access by an admin.");
                        return res.redirect("/login?err=2");
                    } else {
                        if (result.passHash === createHash('sha256').update(loginData.password).digest('hex')) {
                            const key = randomBytes(96).toString("hex");
                            const keyStmt: string = "INSERT INTO keys (key, userId, name, created, expires, admin) VALUES (?, ?, ?, ?, ?, ?)";
                            const keyValues: Array<any> = [
                                key,
                                result.id,
                                result.fullName,
                                String(Date.now()),
                                String(Date.now() + 24 * 60 * 60 * 1000),
                                result.admin,
                            ];
                            authDb.run(keyStmt, keyValues, (err) => {
                                if (err) {
                                    // res.status(500).send("" + 0x1f42 + " internal server error (500)");
                                    return res.redirect("/login?err=0");
                                } else {
                                    res.cookie("key", key, {
                                        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                                        sameSite: "lax",
                                        secure: true,
                                        httpOnly: true,
                                    });
                                    if (result.admin == "true") {
                                        res.cookie("lead", "true", {
                                            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                                            sameSite: "lax",
                                            secure: true,
                                            httpOnly: false,
                                        });
                                    }
                                    return res.redirect("/");
                                }
                            });
                        } else {
                            // res.status(409).send("" + 0x1992 + " bad username/password");
                            return res.redirect("/login?err=1");
                        }
                    }
                } else {
                    // res.status(409).send("" + 0x1992 + " bad username/password");
                    return res.redirect("/login?err=1");
                }
            }
        });
    });
}