# BCC Canteen

### ⚠️⚠️⚠️

```
Submissions from 2025 students will have much higher priority than submissions from 2024, SAP, or higher students.
Please take note of this before planning to attempt this freepass challenge.
```

## 💌 Invitation Letter

As campus life continues to evolve, the need for a fast, transparent, and efficient canteen service becomes increasingly important. We recognize that both customers and canteen operators require a system that simplifies food ordering, payment processing, menu management, and administrative control.

To address this need, we introduce BCC Canteen, a digital platform designed to transform how campus canteens operate. This system aims to provide a seamless food ordering and payment experience for users, efficient menu and order management for canteen owners, and centralized supervision for administrators.

## **⭐** Minimum Viable Product (MVP)

As the initial development phase of BCC Canteen, the system must support the following minimum features:

- New users can register an account ✔️
- Users can log in to the system ✔️
- Users can edit their profile information ✔️
- Users can view available canteens and food menus ✔️
- Users can place food orders (only if stock is available) ✔️
- Users can make payments for their orders ✔️
- Users can view order status of their orders ✔️
- Users can leave feedback or reviews for completed orders ✔️
- Canteen owners can create, update, and delete food menus including stock ✔️
- Canteen owners can view incoming orders ✔️
- Canteen owners can view payment status of orders (e.g., Unpaid, Paid) ✔️
- Canteen owners can update order status (e.g., Waiting, Cooking, Ready, Completed) ✔️
- Canteen owners can remove inappropriate user feedback ✔️
- Admin can add new canteen owner accounts ✔️
- Admin can edit canteen owner accounts ✔️
- Admin can remove user or canteen owner accounts ✔️

## **🌎** Service Implementation

```
GIVEN => I am a new user
WHEN  => I register in the system
THEN  => The system will store and return my registration details

GIVEN => I am a user
WHEN  => I log in to the system
THEN  => The system will authenticate and grant access based on my credentials

GIVEN => I am a user
WHEN  => I edit my profile
THEN  => The system will update my profile information

GIVEN => I am a user
WHEN  => I view available canteens and menus
THEN  => The system will display all canteens and their menu details

GIVEN => I am a user
WHEN  => I place a food order
THEN  => The system will check stock availability, decrease the stock, and record the order with "Unpaid" status

GIVEN => I am a user
WHEN  => I make a payment for my order
THEN  => The system will verify the payment and update payment status to "Paid"

GIVEN => I am a user
WHEN  => I view my order details
THEN  => The system will display order information including payment status (e.g., Paid) and order status (e.g., Cooking)

GIVEN => I am a user
WHEN  => I leave feedback for a completed order
THEN  => The system will save and display my feedback

GIVEN => I am a canteen owner
WHEN  => I create a new menu item
THEN  => The system will store and publish the menu item

GIVEN => I am a canteen owner
WHEN  => I update a menu item
THEN  => The system will apply and confirm the changes

GIVEN => I am a canteen owner
WHEN  => I delete a menu item
THEN  => The system will remove the menu item from the system

GIVEN => I am a canteen owner
WHEN  => I view incoming orders
THEN  => The system will display all orders related to my canteen

GIVEN => I am a canteen owner
WHEN  => I view order payment status
THEN  => The system will display the payment status of each order

GIVEN => I am a canteen owner
WHEN  => I update the order status (e.g., set to "Cooking")
THEN  => The system will update the status only if the order has been paid

GIVEN => I am a canteen owner
WHEN  => I remove user feedback
THEN  => The system will delete the feedback from the system

GIVEN => I am an admin
WHEN  => I add a new canteen owner
THEN  => The system will create a canteen owner account

GIVEN => I am an admin
WHEN  => I edit canteen owner accounts
THEN  => The system will update canteen owner account

GIVEN => I am an admin
WHEN  => I remove a user or canteen owner
THEN  => The system will delete the account from the system
```

## **👪** Entities and Actors

We want to see your perspective about these problems. You can define various types of entities or actors. One thing for sure, there is no true or false statement to define the entities. As long as the results are understandable, then go for it! 🚀

## **📘** References

You might be overwhelmed by these requirements. Don't worry, here's a list of some tools that you could use (it's not required to use all of them nor any of them):

1. [Example Project](https://github.com/meong1234/fintech)
2. [Git](https://try.github.io/)
3. [Cheatsheets](https://devhints.io/)
4. [REST API](https://restfulapi.net/)
5. [Insomnia REST Client](https://insomnia.rest/)
6. [Test-Driven Development](https://www.freecodecamp.org/news/test-driven-development-what-it-is-and-what-it-is-not-41fa6bca02a2/)
7. [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
8. [GraphQL](https://graphql.org/)
9. [gRPC](https://grpc.io/)
10. [Docker Compose](https://docs.docker.com/compose/install/)

## **🔪** Accepted Weapons

> BEFORE CHOOSING YOUR LANGUAGE, PLEASE VISIT OUR [CONVENTION](CONVENTION.md) ON THIS PROJECT
>
> **Any code that did not follow the convention will be rejected!**
>
> 1. Golang (preferred)
> 2. NodeJS
> 3. PHP
> 4. Java

You are welcome to use any libraries or frameworks, but we appreciate it if you use the popular ones.

## **🎒** Tasks

```
The implementation of this project MUST be in the form of a REST, gRPC, or GraphQL API (choose AT LEAST one type).
```

1. Fork this repository
2. Follow the project convention
3. Finish all service implementations
4. Write the installation guide of your back-end service in the section below

## **🧪** API Installation

How to run the API in a local:

### 1. Copy the environment file

Copy [`.env.example`](.env.example) to `.env`:

```bash
cp .env.example .env
```

### 2. Configure environment variables

Edit `.env` and:

- **Set** the values you need (e.g. `DATABASE_URL`, `JWT_SECRET`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`).
- **Remove** any variables you do not use.

Save the file when done.

### 3. Install dependencies

```bash
pnpm install
```

### 4. Start the database (local development)

For local development, a database can be started using [**start-database.sh**](start-database.sh). The script starts a PostgreSQL container using your `DATABASE_URL` from `.env`. Ensure Docker or Podman is installed and running, then:

```bash
./start-database.sh
```

or

```bash
bash start-database.sh
```

### 5. Run the development server

```bash
pnpm dev
```

**API documentation** is available at **[/api-docs](/api-docs)** (e.g. `http://localhost:3000/api-docs`).

### 6. Payment testing

To test payments, use the Midtrans sandbox simulator: [https://simulator.sandbox.midtrans.com/](https://simulator.sandbox.midtrans.com/)

### Production

A [Dockerfile](Dockerfile) is provided for production.

## Preview

A live preview of the API is available at **[https://bcc-canteen.benspace.xyz/api-docs/](https://bcc-canteen.benspace.xyz/api-docs/)**.

**Admin credentials for testing:**

- Email: `admin@test.com`
- Password: `Admin123!`

## **📞** Contact

Have any questions? You can contact [Atha](https://www.instagram.com/mhqif/).

## **🎁** Submission

Please follow the instructions on the [Contributing guide](CONTRIBUTING.md).

![cheers](https:

> This is not the only way to join us.
>
> **But, this is the _one and only way_ to instantly pass.**
