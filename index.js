const express = require('express')
const app = express()
const cors =require("cors")
require('dotenv').config();
const stripe = require("stripe")(process.env.Payment_secret);
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT||5000;


// middle ware
app.use(cors({
  origin:["http://localhost:5173","https://your-college-27b9c.web.app"],
  credentials:true
}))
app.use(express.json())
app.use(cookieParser())


const verifytoken =(req,res,next)=>{
  const token =req.cookies.token;
  if(!token){
   return res.status(401).send({message: "unauthorized"})
  }
  jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message: "unauthorized orcuured"})
    }

    req.user =decoded;
    next()
  })


}





const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.1hhdzxu.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // database 
const partnersCollection= client.db("collegeDB").collection("partners");
const teacherrequestCollection= client.db("collegeDB").collection("teacherrequest");
const usersCollection= client.db("collegeDB").collection("users");
const classCollection= client.db("collegeDB").collection("classes");
const assignmentCollection= client.db("collegeDB").collection("assignment");
const enrolledCollection= client.db("collegeDB").collection("enrolled");
const reviewsCollection= client.db("collegeDB").collection("reviews");
const submitCollection= client.db("collegeDB").collection("submit");



// /jwt
app.post("/jwt",async (req,res)=>{
  const user =req?.body;
  console.log(user)
const token =jwt.sign(user,process.env.JWT_SECRET,{expiresIn:"1h"})
res.cookie("token",token,{
httpOnly:true,
secure:true,
sameSite:"none"
})
.send({success:true})

})


app.post("/logout",(req,res)=>{
  const user =req.body;
  console.log("loggingout" ,user)
  res.clearCookie("token",{maxAge:0}).send({message:"succes"})
})



const verifyadmin= async (req,res,next)=>{
  const query ={email:req.user.email}
  const result = await usersCollection.findOne(query);
  const isAdmin =result.role == "admin"
  
  if(!isAdmin){
    return res.status(403).send({message: "unauthorized orcuured"});
   
  }
  next()
}

const verifyteacher= async (req,res,next)=>{
  const query ={email:req.user.email}
  const result = await usersCollection.findOne(query);
  const isTeacher =result.role === "teacher"
  if(!isTeacher){
    return res.status(403).send({message: "unauthorized orcuured"});
    
  }
  next()
}

app.get("/partners",async(req,res)=>{
 const result = await partnersCollection.find().toArray();
 res.send(result)
})
app.get("/classes",async(req,res)=>{
 const result = await classCollection.find().toArray();
 res.send(result)
})
app.get("/classes/:id",async(req,res)=>{
  const id =req?.params?.id;
  const query ={_id: new ObjectId(id)}
 const result = await classCollection.findOne(query);
 res.send(result)
})
app.delete("/deleteclass/:id",async(req,res)=>{
  const id =req?.params?.id;
  const query ={_id: new ObjectId(id)}
 const result = await classCollection.deleteOne(query);
 res.send(result)
})


app.post("/addClass",verifytoken,verifyteacher,async (req,res)=>{
  const classinfo =req.body;
  const result =await classCollection.insertOne(classinfo);
  res.send(result);
})
app.patch("/approveclass",async(req,res)=>{
  if(req.body){
    const filter ={_id : new ObjectId(req.body.id)}
    const updateDoc = {
      $set: {
        status:req?.body?.action
      },
    };
    
  
  
    const resulta =await classCollection.updateOne(filter,updateDoc);
    res.send(resulta)
  }
})

app.patch("/classenroll/:id",async(req,res)=>{
  const id=req?.params?.id;

  const {enrolledstudents} =req.body;
  console.log(enrolledstudents)
  const filter ={_id: new ObjectId(id)};

  const updateDoc = {
    $set: {
      total_enrolment: enrolledstudents + 1
    },
  };
  const result = await classCollection.updateOne(filter,updateDoc);
  res.send(result)
  
})


app.put("/updateClass/:id",async (req,res)=>{

  const id =req.params.id;
  const updateinfo =req.body;
  console.log(updateinfo)
  const query ={_id: new ObjectId(id)}
  const updateDoc = {
    $set: {
      status:updateinfo.status,
      Title:updateinfo.Title,
      Name:updateinfo.Name,
      Image:updateinfo.Image,
      Short_description:updateinfo.Short_description,
      total_enrolment:0,
      email:updateinfo.email,
      price:updateinfo.price
    },
  };

  const result =await classCollection.updateOne(query,updateDoc)
  res.send(result)
  

})




app.get("/myclassesteacher/:email",async(req,res)=>{
  const query ={email :req?.params?.email}
  const result = await classCollection.find(query).toArray();
  res.send(result)
 })
//
// teacher related api

app.post("/teacherRequest",async (req,res)=>{
  const teacherinfo =req.body;
  console.log("teacher info",teacherinfo)
  const result = await teacherrequestCollection.insertOne(teacherinfo);
  res.send(result)
})

app.get("/teacherreq",verifytoken,verifyadmin,async (req,res)=>{
  const result= await teacherrequestCollection.find().toArray();
  res.send(result)
})

app.patch("/teacherreq",async (req,res)=>{
 if(req.body){
  const filter ={_id : new ObjectId(req.body.id)}
  const updateDoc = {
    $set: {
      stattus: req.body.action
    },
  };
  
  const options = { upsert: true };

  const resulta =await teacherrequestCollection.updateOne(filter,updateDoc,options);

  res.send(resulta)
// // updating user role
  if(req.body.action === "Accepted"){
    const filtera ={email : req.body.email}
    const updateDoca = {
      $set: {
        role: "teacher"
      },
    };
   
  
    const result =await usersCollection.updateOne(filtera,updateDoca,options);
  }
  
 }

})

// savinguser into database

app.get('/users',async (req,res)=>{
  console.log(req.query.email)

  const query ={
    email: {$regex: req?.query?.email, $options:"i"
    }
  }
  const result = await usersCollection.find(query).toArray();
  res.send(result)

})

app.get('/users/:email',async (req,res)=>{


  const query ={email:req.params.email}
  const result = await usersCollection.findOne(query);
  res.send(result)

})

app.post("/saveUser",async (req,res)=>{
  const userinfo =req.body;
  console.log("teacher info",userinfo)
  const result = await usersCollection.insertOne(userinfo);
  res.send(result)
})

app.patch(`/makeuseradmin/:email`,async (req,res)=>{
  console.log(req.params.email)
  const filtera ={email : req?.params.email}
  const updateDoca = {
    $set: {
      role: "admin"
    },
  };
 

  const result =await usersCollection.updateOne(filtera,updateDoca);

})
app.patch(`/makestudent/:email`,async (req,res)=>{
  console.log(req.params.email)
  const filtera ={email : req?.params.email}
  const updateDoca = {
    $set: {
      role: "student"
    },
  };
 

  const result =await usersCollection.updateOne(filtera,updateDoca);
  res.send(result)

})

// assignment related api 


app.post("/assignment",async(req,res)=>{
  const assignmentInfo =req.body;
  const result =await assignmentCollection.insertOne(assignmentInfo);
  res.send(result)

})

app.get("/assignments",async(req,res)=>{
  // const query={email:req?.params?.email}

  const result = await assignmentCollection.find().toArray();
  res.send(result)
})
app.get("/submitted/:id",async(req,res)=>{
  // const query={email:req?.params?.email}
const query ={assignmentid:req?.params?.id}
  const result = await submitCollection.find(query).toArray();
  res.send(result)
})

app.post('/assignmentsubmit',async (req,res)=>{

 const  subinfo ={
  assignmentid:req.body.ida[0],
  date: new Date()
 }
  const resulta =await submitCollection.insertOne(subinfo);
  res.send(resulta);
  
})

// enrolled 

app.post("/payment",async(req,res)=>{
  const payinfo =req.body;
  const result =await enrolledCollection.insertOne(payinfo);
  res.send(result);
})


app.get("/myenrolled/:email",async (req,res)=>{
 const email =req?.params?.email;
if(email){
  const query ={studentemail:email
  }
  const  result =await enrolledCollection.find(query).toArray();
  res.send(result)
}

})




// rewview
app.post("/reviews",async (req,res)=>{
  const reviewinfo =req.body;

  const result = ssubmit.insertOne(reviewinfo);
  res.send(result)
})


app.get("/reviews",async(req,res)=>{
  const result = await reviewsCollection.find().toArray();
  res.send(result)
 })

// PAYMENT REALATED API

app.post("/create-payment-intent", async (req, res) => {

  const{price} =req.body;
  
  if(price){
    const amount =parseInt(price * 100)
    const paymentIntent = await stripe.paymentIntents.create({
      amount:amount ,
      currency: "usd",
      payment_method_types:["card"]
    });
  
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  }

  

  
});






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('welcome to your college')
})

app.listen(port, () => {
  console.log(`your college server listening on port ${port}`)
})