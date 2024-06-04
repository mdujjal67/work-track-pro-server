const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 9000;

// middleware
app.use(cors());
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



    // -------------jwt related api--------------
    app.post('/jwt', async (req, res) => {
        const user = req.body;
        console.log(user);
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' }); //token generate
  
        // the commented code would work only localhost but bellow codes would work with production and localhost also.
        res.send({ token })
      });



    
    //------------------- service related api ----------------

    app.post('/users', async(req, res) => {
        const user = req.body;
        // insert email if user doesn't exists
        // It can be done many ways(1. email unique, 2. upsert, 3. simple checking)
        const query = {email: user.email};
        const existingUser = await usersCollection.findOne(query);
        if(existingUser){
          return res.send({message: "user already exists."})
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      })

    // contact data receive from client side visitor
    app.post('/contactedUser', async(req, res) => {
        const contactedUser = req.body
        console.log(contactedUser)
        const result = await contactedCollection.insertOne(contactedUser)
        res.send(result)
      });


      // read services
    app.get('/testimonials', async(req, res) => {
        const result = await testimonialsCollection.find().toArray();
        res.send(result);
    });


    // read services
    app.get('/services', async(req, res) => {
        const result = await servicesCollection.find().toArray();
        res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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