const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 9000;

// middleware
const corsOptions = {
    origin: ['http://localhost:5173',
        'https://worktrackpro-67.web.app',
        'https://worktrackpro-67.firebaseapp.com'
    ],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());


// --------------mongoDB start--------------


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7tyfnet.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const servicesCollection = client.db('WorkTrackPro').collection('services');
        const contactedCollection = client.db('WorkTrackPro').collection('contactedUser');
        const testimonialsCollection = client.db('WorkTrackPro').collection('testimonials');
        const usersCollection = client.db('WorkTrackPro').collection('users');
        const workSheetCollection = client.db('WorkTrackPro').collection('workSheet');
        const paymentsCollection = client.db('WorkTrackPro').collection('payments');



        // -------------jwt related api--------------
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' }); //token generate

            // the commented code would work only localhost but bellow codes would work with production and localhost also.
            res.send({ token })
        });




        //------------------- service related api ----------------


        // -------------middlewares------------
        const verifyToken = (req, res, next) => {
            // console.log("token", req?.headers?.authorization)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized access' });
                }
                req.decoded = decoded;
                next();
            });
        };

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            if (!user || user.role !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden access' });
            }
            next();
        };

        // const verifyHR = async (req, res, next) => {
        //     const email = req.decoded.email;
        //     const query = { email };
        //     const user = await usersCollection.findOne(query);
        //     if (!user || user.role !== 'HR') {
        //         return res.status(403).send({ message: 'Forbidden access' });
        //     }
        //     next();
        // };



        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden access' });
            }

            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ admin: user?.role === 'Admin' });
        });


        app.get('/users/hr/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden access' });
            }

            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ hr: user?.role === 'HR' });
        });


        app.get('/users/employee/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden access' });
            }

            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ employee: user?.role === 'Employee' });
        });





        // send data to database from work sheet page
        app.post('/workSheet', async (req, res) => {
            const workSheet = req.body
            const result = await workSheetCollection.insertOne(workSheet)
            res.send(result)
        });


        //   api to show all works on the work-sheet
        app.get('/workSheet', verifyToken, async (req, res) => {
            const result = await workSheetCollection.find().toArray();
            res.send(result)
        });


        //   api to show only logged in user's works on the work-sheet
        app.get('/workSheet/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            try {
                const result = await workSheetCollection.find({ email: email }).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching works:", error);
                res.status(500).send({ message: "Error fetching works" });
            }
        });


        app.get('/users/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            try {
                const result = await usersCollection.find({ email: email }).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching works:", error);
                res.status(500).send({ message: "Error fetching works" });
            }
        });

        // send data to the database of users
        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert email if user doesn't exists
            // It can be done many ways(1. email unique, 2. upsert, 3. simple checking)
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already exists." })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });


        //   api to show users on the UI
        app.get('/users', verifyToken, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        });



        // demo post api to verify the hr automatically after signup
        // app.post('/users', async (req, res) => {
        //     const user = req.body;
        //     // insert email if user doesn't exist
        //     // It can be done in multiple ways (e.g., unique email constraint, upsert, simple checking)
        //     const query = { email: user.email };
        //     const existingUser = await usersCollection.findOne(query);

        //     if (existingUser) {
        //         return res.send({ message: "User already exists." });
        //     }

        //     // Automatically verify HR users
        //     const verifiedStatus = user.role === "HR" ? true : false;

        //     // Add verified status to the user object
        //     const userWithVerifiedStatus = {
        //         ...user,
        //         verified: verifiedStatus
        //     };

        //     try {
        //         // Insert the user into the database
        //         const result = await usersCollection.insertOne(userWithVerifiedStatus);
        //         res.send(result);
        //     } catch (error) {
        //         console.error("Error inserting user:", error);
        //         res.status(500).send({ message: "Error inserting user" });
        //     }
        // });


        
        // update a user as a HR
        app.patch('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'HR',
                    isVerified: 'Verified',
                    designation: 'HR'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });


        // update salary of a employee
        app.put('/users/salary/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;

            const newSalary = req.body.newSalary;
            const currentSalary = req.body.currentSalary;

            console.log("New Salary:", newSalary);
            console.log("Current Salary:", currentSalary);

            if (!newSalary || isNaN(newSalary) || newSalary <= currentSalary) {
                return res.status(400).send({ message: 'Invalid salary value' });
            }


            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    salary: newSalary,
                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);

        });

        // update users status to fired
        app.put('/users/updateStatus/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    employeeStatus: 'Fired'
                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });



        //   update verify status of a employee
        app.put('/users/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    isVerified: 'Verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });




        // ------------check the status of a employee for login (fired or not)--------------
        app.get('/users/status/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            if (user) {
                res.send({ status: user.employeeStatus });
            } 
            else {
                res.status(404).send({ message: 'User not found' });
            }
        });


        //   contact data show to admin of visitors
        app.get('/messages', verifyToken, async (req, res) => {
            const result = await contactedCollection.find().toArray();
            res.send(result);
        });


        // contact data receive from client side visitor
        app.post('/contactedUser', async (req, res) => {
            const contactedUser = req.body
            console.log(contactedUser)
            const result = await contactedCollection.insertOne(contactedUser)
            res.send(result)
        });


        // read testimonials
        app.get('/testimonials', async (req, res) => {
            const result = await testimonialsCollection.find().toArray();
            res.send(result);
        });


        // read services
        app.get('/services', async (req, res) => {
            const result = await servicesCollection.find().toArray();
            res.send(result);
        });



        // ------------payment intent-----------
        app.post('/create-payment-intent', async (req, res) => {
            const { salary } = req.body;
            const amount = parseInt(salary * 100);
            console.log('amount inside the intent:', amount)

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });


        // api to post payment info to the database
        app.post('/payments', verifyToken, async (req, res) => {
            const payments = req.body
            const result = await paymentsCollection.insertOne(payments)
            res.send(result)
        });


        // to read & show the payment info from database
        app.get('/payments', verifyToken, async (req, res) => {
            const result = await paymentsCollection.find().toArray();
            res.send(result);
        });


        app.get('/payments/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            try {
                const result = await paymentsCollection.find({ email }).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching works:", error);
                res.status(500).send({ message: "Error fetching works" });
            }
        });


        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// -----------------MongoDB end-------------------



app.get('/', (req, res) => {
    res.send('WorkTrackPro is sitting')
})

app.listen(port, () => {
    console.log(`WorkTrackPro is sitting on port ${port}`)
})