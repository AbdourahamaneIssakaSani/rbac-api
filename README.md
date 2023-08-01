# RBAC System Server

![Node.js](https://img.shields.io/badge/-Node.js-43853d?style=flat-square&logo=Node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/-Express.js-404D59?style=flat-square)
![MongoDB](https://img.shields.io/badge/-MongoDB-black?style=flat-square&logo=mongodb)
![Mongoose](https://img.shields.io/badge/-Mongoose-880000?style=flat-square&logo=mongoose&logoColor=white)
![JWT](https://img.shields.io/badge/-JWT-black?style=flat-square&logo=JSON%20web%20tokens)

This repository contains the source code for an API server that implements Role Based Access Control (RBAC) in Node.js. The server uses Express.js, MongoDB (with Mongoose), and JSON Web Tokens (JWT) for secure authentication.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### System Requirements

- A Linux system based on Debian distributions such as Ubuntu (recommended).
- Alternatively, if you're on Windows 10/11, you can use [Windows Subsystem for Linux 2 (WSL 2)](https://learn.microsoft.com/en-us/windows/wsl/) to create a compatible environment.

> **Note for WSL users:** When using WSL, it's recommended to open your code editor from within the WSL terminal. For instance, if you're using VS Code, navigate to the directory of the repository and run `code .` This command will not only open the current directory in VS Code, but also install VS Code for WSL if it isn't already installed.

### Prerequisites

- Node.js (v18.0 or later)
- MongoDB (a cloud-based MongoDB service like MongoDB Atlas is recommended)

### Installing

1. Clone the repository:

```sh
git clone https://github.com/AbdourahamaneIssakaSani/rbac-system.git
```

2. Change the repository directory

```sh
cd rbac-system
```

3. Install NPM packages:

```sh
npm install
```

## Setting Up Environment Variables

For development, you'll need to create a `.env.development` file in `src/config/envs/` and add the following environment variables:

```bash
PORT=9000
JWT_ACCESS_SECRET=Your_JWT_ACCESS_Secret
JWT_REFRESH_SECRET=Your_JWT_REFRESH_Secret
JWT_ACCESS_EXPIRES_IN=30d
JWT_REFRESH_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
V1_MONGO_URI=Your_MongoDB_URI
EMAIL_USERNAME=Your_Email_Username
EMAIL_PASSWORD=Your_Email_Password
```

For other environnement, just use `.env.production` or `.env.test`

Regarding the `EMAIL_USERNAME` and `EMAIL_PASSWORD` variables, these represent your _**Gmail SMTP credentials**_ As this application is utilizing Gmail's SMTP server, you'll need to enable the [_**Less secure apps**_](https://support.google.com/accounts/answer/6010255?hl=en) setting on your Gmail account. For evaluators of project, a Google passkey will be provided alongside the project submission for complete functionality.

> Remember not to commit `.env` files to your GitHub repository. They should be listed in your `.gitignore` file.

## Running the Server

After you have installed all dependencies and set up your environment variables, you can start the server using the following command:

```sh
npm start
```

To run in developement environment:

```sh
npm run start:dev
```

## Running Tests

To run tests, execute:

```sh
npm test
```

## Testing the API with Postman

Follow these steps to test the API using Postman:

1. Install [Postman](https://www.postman.com/downloads/) on your machine or use the web version.
2. Import the [RBAC System Postman collection](https://documenter.getpostman.com/view/23125475/2s9Xxtzbx4).
3. Run the requests in logic order described in the documentation.

## Built With

- **Express.js** - Fast, unopinionated, minimalist web framework for Node.js
- **MongoDB** - Source-available cross-platform document-oriented database program
- **Mongoose** - MongoDB object modeling for Node.js
- **jsonwebtoken** - An implementation of JSON Web Tokens (JWT)