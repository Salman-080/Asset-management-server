const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.SECRET_KEY_STRIPE);
// console.log(stripe)

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.send("Assest Management running");
})

app.listen(port, () => {
    console.log(`app running on port: ${port}`);
})

console.log(process.env.DB_USER)
console.log(process.env.DB_PASS)

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pcelgh9.mongodb.net/?retryWrites=true&w=majority`;

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
        const userCollections = client.db('assetDB').collection('userCollections');
        const productCollections = client.db('assetDB').collection('productCollections');
        const teamCollections = client.db('assetDB').collection('teamCollections');
        const requestAssetCollections = client.db('assetDB').collection('requestAssetCollections');
        const customRequestAssetCollections = client.db('assetDB').collection('customRequestAssetCollections');


        //register usersInfo Store
        app.post("/registerUsers", async (req, res) => {
            const userInfo = req.body;

            const result = await userCollections.insertOne(userInfo);
            res.send(result);
        })

        // check and get if user is admin of not

        app.get("/user/admin/:email", async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const query = { email: email };

            let isAdmin = false;

            const result = await userCollections.findOne(query);
            if (result) {
                isAdmin = result?.role === "Admin";

            }
            console.log(isAdmin)
            res.send({ isAdmin });
        })

        //admin info company name, dateof birth

        app.get("/user/adminInfo/:email", async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const result = await userCollections.findOne(query);
            console.log(result)
            res.send(result);
        })

        // add/store product/asset to database by admin/hr

        app.post("/productsAdd", async (req, res) => {
            const productsInfo = req.body;

            productsInfo.assetQuantity = parseInt(productsInfo.assetQuantity, 10);

            const result = await productCollections.insertOne(productsInfo);

            res.send(result);
        })

        // employee register data post to database

        app.post("/employeeInfo", async (req, res) => {
            const employeeInfo = req.body;

            const query = { registerEmail: employeeInfo?.registerEmail };
            const exists = await userCollections.findOne(query);
            if (!exists) {
                const result = await userCollections.insertOne(employeeInfo);
                res.send(result);
            }
            else {
                res.send("already exists");
            }

        })

        // users get to add in the team

        app.get("/users", async (req, res) => {
            // const email =req.params.email;
            const query = { role: { $exists: false } };
            const result = await userCollections.find(query).toArray();

            res.send(result);

        })

        // get all products/assets added by admin. query by his email

        app.get("/assetsList/:email", async (req, res) => {
            const email = req.params.email;
            // const query2= req?.query;
            const query = { email: email };

            const result = await productCollections.find(query).toArray();

            res.send(result);
        })
        //update the users role to the users collection

        app.patch("/updateUserRole/:id", async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "employee"
                },
            };

            const result = await userCollections.updateOne(query, updateDoc);
            res.send(result);
        })

        // adding to team

        app.post("/addToTeam", async (req, res) => {
            const teamUserInfo = req.body;

            const result = await teamCollections.insertOne(teamUserInfo);

            res.send(result);
        })

        //get request asset for employee productscollection admin email and users under admin email same

        app.get("/requestAssets/:email", async (req, res) => {
            const employeeEmail = req.params.email;

            const result = await teamCollections.aggregate([
                {
                    $match: { email: employeeEmail }
                },
                {
                    $lookup: {
                        from: "productCollections",
                        localField: "adminEmail",
                        foreignField: "email",
                        as: "assets"
                    }
                },
                {
                    $unwind: "$assets"
                },
                {
                    $replaceRoot: { newRoot: "$assets" }
                },
                {
                    $project: {
                        _id: 1,
                        assetName: 1,
                        assetImage: 1,
                        assetQuantity: 1,
                        assetType: 1,
                        assetAddedDate: 1,
                        email: 1
                    }
                }
            ]).toArray()

            res.send(result);
        })

        // employee requesting product/asset data storing on database

        app.post("/assetRequesting", async (req, res) => {
            const data = req.body;

            const requestedDateTime = new Date();

            const requestingAssetData = {
                requestedAssetId: data.requestedAssetId,
                assetName: data.assetName,
                assetImage: data.assetImage,
                assetType: data.assetType,
                assetQuantity: data.assetQuantity,
                requesterName: data?.requesterName,
                requesterEmail: data?.requesterEmail,
                requesterImage: data?.requesterImage,
                additionalInfo: data?.additionalInfo,

                adminEmail: data.adminEmail,
                requestedDateTime
            }

            console.log(requestingAssetData);

            const result = await requestAssetCollections.insertOne(requestingAssetData);

            res.send(result)

        })

        //show all request asset for admin

        app.get("/allRequest/:email", async (req, res) => {
            const adminEmail = req.params.email;

            const query = { adminEmail: adminEmail };

            const result = await requestAssetCollections.find(query).toArray();
            res.send(result);
        })


        //make custom requested asset by employee store to database

        app.post("/makeCustomRequest", async (req, res) => {
            const customRequestedAsset = req.body;

            console.log(customRequestedAsset);

            const result = await customRequestAssetCollections.insertOne(customRequestedAsset);

            res.send(result);
        })

        //getting current employeers admin email

        app.get("/employeersAdmin/hisEmail/:email", async (req, res) => {
            const employeersEmail = req.params.email;
            console.log(employeersEmail);

            const query = { email: employeersEmail };

            const result = await teamCollections.findOne(query);
            console.log(result)
            res.send(result);


        })


        // getting custom requested asset for admin

        app.get("/customRequestedAssets/:email", async (req, res) => {
            const adminEmail = req.params.email;

            const query = { adminEmail: adminEmail };

            const result = await customRequestAssetCollections.find(query).toArray();
            res.send(result);
        })

        // getting current employees custom requests for employee home page

        app.get("/myCustomRequests/:email", async (req, res) => {
            const employeeEmail = req.params.email;
            const query = { requesterEmail: employeeEmail };

            const result = await customRequestAssetCollections.find(query).toArray();

            res.send(result);
        })

        // checking if the logged in user is employee or not

        app.get("/user/employee/:email", async (req, res) => {
            const userEmail = req.params.email;

            const query = { registerEmail: userEmail };

            let isEmployee = false;

            const result = await userCollections.findOne(query);
            if (result) {
                isEmployee = result?.role === "employee";

            }
            console.log(result)
            console.log("he is employee", isEmployee)
            res.send({ isEmployee });
        })

        // get all data by merging custom request and request assets for myAssets page

        app.get("/myAssets/:email", async (req, res) => {
            const userEmail = req.params.email;

            const query = { requesterEmail: userEmail };

            const result = await requestAssetCollections.find(query).toArray();



            res.send(result);
        })


        // approve update asset 

        app.patch("/approveAssetRequest/:id/:id2", async (req, res) => {
            const assetId = req.params.id;
            const assetId2 = req.params.id2;
            const approvedDate = new Date();
            const query = { _id: new ObjectId(assetId2) };
            const query2 = { _id: new ObjectId(assetId) };



            const updateDoc = {
                $set: {
                    status: "Approved",
                    approvedDate
                },
            };
            const updateDoc2 = {
                $inc: {
                    assetQuantity: -1
                },
            };

            const result = await requestAssetCollections.updateOne(query, updateDoc);
            const result2 = await productCollections.updateOne(query2, updateDoc2);

            res.send({ result, result2 });

        })

        // after clicking on return button the product quantity will be inc +1

        app.patch("/returnQuantityInc/:id/:id2", async (req, res) => {
            const productId = req.params.id;
            const productId2 = req.params.id2;
            const query1 = { _id: new ObjectId(productId) };
            const query2 = { _id: new ObjectId(productId2) };


            const updateDoc = {
                $inc: {
                    assetQuantity: 1
                },
            };

            const updateDoc2 = {
                $set: {
                    returned: "Yes",

                },
            };

            const result1 = await productCollections.updateOne(query1, updateDoc);
            const result2 = await requestAssetCollections.updateOne(query2, updateDoc2); // for disable reurned button check

            res.send({ result1, result2 });
        })


        // cancel pending request of asset from employee side

        app.delete("/cancelRequest/:id", async (req, res) => {
            const assetId = req.params.id;

            const query = { _id: new ObjectId(assetId) };

            const result = await requestAssetCollections.deleteOne(query);

            res.send(result);
        })

        // total product counting in product collection

        app.get("/totalProductCount/:email", async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const result = await productCollections.countDocuments(query);
            console.log(result);

            res.send({ result });
        })

        //payment

        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;

            const amount = parseInt(price * 100);

            console.log(price, amount);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",

                payment_method_types: ["card"],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })

        // assetList sorting

        app.get("/sortOperation/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const query2 = req?.query;
            console.log(query);
            console.log(query2)
            const options = {
                sort: {
                    assetQuantity: query2.sorting === 'asc' ? 1 : -1,

                }
            }

            const result = await productCollections.find(query, options).toArray();

            res.send(result);

        })

        // // assetList filtering

        app.get("/filterOperation/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const query2 = req?.query;

            console.log(query2);

            if (query2?.filtering == 'available') {
                query.assetQuantity = { $gt: 0 };
            }
            else if (query2?.filtering == 'stockOut') {
                query.assetQuantity = { $lt: 1 };
            }

            const result = await productCollections.find(query).toArray();

            res.send(result);


        })


        // // assetList search operation

        app.get("/searchOperation/:email", async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email,

            };

            const query2 = req?.query;

            console.log(query2);

            if (query2?.searching && query2.searching.length !== 0) {
                query.assetName = { $regex: query2.searching, $options: 'i' };
            }

            const result = await productCollections.find(query).toArray();

            res.send(result);


        })

        // // get specific admins all employees

        app.get("/myEmployees/:email", async (req, res) => {
            const email = req.params.email;

            const query = { adminEmail: email };

            const result = await teamCollections.find(query).toArray();
            res.send(result);
        })

        // allRequests page for hr/admin search operation
        // // allRequests page for hr/admin search operation

        app.get("/allRequests/searchOperation/:email", async (req, res) => {
            const email = req.params.email;

            const query = {
                adminEmail: email,
                // assetName: { $regex: req?.query?.searching, $options: 'i' }

            };
            const query2 = req?.query;

            if (query2?.searching && query2.searching.length !== 0) {
                query.assetName = { $regex: query2.searching, $options: 'i' };
            }


            console.log(email)
            console.log(query)
            const result = await requestAssetCollections.find(query).toArray();
            console.log(result);
            res.send(result);



        })

        // remove employee from my team and also remove role from usersCollections so that other admins can hire him


        app.delete("/removeEmployee/:id/:email", async (req, res) => {
            const employeeId = req.params.id;
            const registerEmail = req.params.email;
            console.log(employeeId, registerEmail);

            const query = { _id: new ObjectId(employeeId) };

            const result = await teamCollections.deleteOne(query);

            const query2 = { registerEmail: registerEmail }

            const updateDoc = {
                $unset: {
                    role: 1
                }
            }


            const result2 = await userCollections.updateOne(query2, updateDoc);
            res.send({ result, result2 });
        })




        // getting employees team members data by querying his admin email

        app.get("/myColleagues/:email/:employeeEmail", async (req, res) => {
            const adminEmail = req.params.email;
            const currentEmployeeEmail = req.params.employeeEmail;
            console.log(adminEmail, currentEmployeeEmail);
            const query = {
                adminEmail: adminEmail,
                email: { $ne: currentEmployeeEmail }
            };

            const result = await teamCollections.find(query).toArray();

            res.send(result);
        })

        // birthday this month present members

        app.get("/allMembersUnderAdmin/:email", async (req, res) => {
            const email = req.params.email;

            const query = { adminEmail: email };
            const result = await teamCollections.find(query).toArray();

            res.send(result);
        })


        app.get("/employeeInfo/:employeeEmail", async (req, res) => {
            const employeeEmail = req.params.employeeEmail;

            const query = { email: employeeEmail };
            const result = await teamCollections.findOne(query);

            res.send(result);
        })


        //reject all request page from admin
        app.patch("/rejectAssetRequest/:id", async (req, res) => {


            const assetId = req.params.id;

            const rejectedDate = new Date();
            const query = { _id: new ObjectId(assetId) };




            const updateDoc = {
                $set: {
                    status: "Rejected",
                    rejectedDate
                },
            };


            const result = await requestAssetCollections.updateOne(query, updateDoc);


            res.send({ result });

        })


        app.get("/monthlyRequests/:email", async (req, res) => {
            const email = req.params.email;

            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;

            console.log(currentDate, currentYear, currentMonth)
            const query = {
                requestedDateTime: {
                    $gte: new Date(currentYear, currentMonth - 1, 1),
                    $lt: new Date(currentYear, currentMonth, 1),
                },
                requesterEmail: email,
            }

            const result = await requestAssetCollections.find(query).sort({ requestedDateTime: -1 }).toArray();
            console.log(result);

            res.send(result)
        })


        // frequestly requested items
        app.get("/frequentlyRequested/:email", async (req, res) => {
            const email = req.params.email;


            const result = await requestAssetCollections.aggregate([
                {
                    $match: {
                        requesterEmail: email
                    }
                },
                {
                    $group: {
                        _id: "$requestedAssetId",
                        count: { $sum: 1 },
                        documents: { $push: "$$ROOT" }
                    }
                },
                {
                    $sort: { count: -1, _id: 1 }
                },
                {
                    $group: {
                        _id: null,
                        uniqueDocuments: { $push: { $arrayElemAt: ["$documents", 0] } }
                    }
                },
                {
                    $unwind: "$uniqueDocuments"
                },
                {
                    $replaceRoot: { newRoot: "$uniqueDocuments" }
                },
                {
                    $limit: 4
                }
            ]).toArray();

            res.send(result);
        })

        // adminHome Top most requested Items

        app.get("/mostRequestedItems/:email", async (req, res) => {
            const adminEmail = req.params.email;

            const result = await requestAssetCollections.aggregate([
                {
                    $match: {
                        adminEmail: adminEmail,
                    }
                },
                {
                    $group: {
                        _id: "$requestedAssetId",
                        count: { $sum: 1 },
                        documents: { $push: "$$ROOT" }
                    }
                },
                {
                    $sort: { count: -1, _id: 1 }
                },
                {
                    $group: {
                        _id: null,
                        uniqueDocuments: { $push: { $arrayElemAt: ["$documents", 0] } }
                    }
                },
                {
                    $unwind: "$uniqueDocuments"
                },
                {
                    $replaceRoot: { newRoot: "$uniqueDocuments" }
                },
                {
                    $limit: 4
                }
            ]).toArray();

            res.send(result);

        })

        // admin home limited stock items

        app.get("/limitedStock/:email", async (req, res) => {
            const adminEmail = req.params.email;

            const query = {
                email: adminEmail,

                assetQuantity: { $lt: 10 }
            }

            const result = await productCollections.find(query).toArray();

            res.send(result)
        })


        // fetch requestedCollections data for pie chart in admin home

        app.get("/requestAssetsTypeData/:email", async (req, res) => {
            const email = req.params.email;

            const result = await requestAssetCollections.aggregate([
                {
                    $match: {
                        adminEmail: email,
                    }
                },
                {
                    $group: {
                        _id: "$assetType",
                        total: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        assetType: "$_id",
                        total: 1
                    }
                }


            ]).toArray();

            res.send(result);
        })

        // My Profile Data

        app.get("/myProfileData/:email", async (req, res) => {
            const email = req.params.email;

            const query = { email: email };

            const result = await userCollections.findOne(query);

            res.send(result);
        })

        // Updating my profile datas

        app.patch("/upDatingMyProfileData/:email", async (req, res) => {
            const email = req.params.email;
            const updatingInfo = req.body;

            const query = { email: email };

            const updateDatas = {
                $set: {
                    name: updatingInfo.name,
                    birthDate: updatingInfo.birthDate
                }
            };

            const result = await userCollections.updateOne(query, updateDatas);
            res.send(result);
        })

        //custom request approve

        app.patch("/approveCustomAssetRequest/:id", async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const updateData = {
                $set: {
                    status: "Approved"
                }
            };

            const result = await customRequestAssetCollections.updateOne(query, updateData);

            res.send(result);

        })

        app.patch("/rejectCustomAssetRequest/:id", async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const updateData = {
                $set: {
                    status: "Rejected"
                }
            };

            const result = await customRequestAssetCollections.updateOne(query, updateData);

            res.send(result);

        })


        app.patch("/addPackage/:email", async (req, res) => {
            const email = req.params.email;
            const addingPackage = req.body;
            console.log(addingPackage)

            const query = { email: email };

            const findData = await userCollections.findOne(query);

            const storedcurrentPackageLimit = findData?.currentPackageLimit;


            const updateDoc = {
                $set: {
                    package: addingPackage.package,
                    currentPackageLimit: parseInt(addingPackage?.package.split(" ")[0]) + storedcurrentPackageLimit,
                }
            };
            const result = await userCollections.updateOne(query, updateDoc);
            res.send(result);
        })



        app.get("/currentPackageLimit/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };

            const result = await userCollections.findOne(query);

            console.log(result);

            const currentPackageLimit = result?.currentPackageLimit;
            res.send({ currentPackageLimit });
        })

        // decrease limit after adding to the team

        app.patch("/decreasePackageLimit/:email", async (req, res) => {
            const email = req.params.email;

            const query = { email: email };

            const updateDoc = {
                $inc: {
                    currentPackageLimit: -1,
                }
            };

            const result = await userCollections.updateOne(query, updateDoc);

            res.send(result);
        })

        //package exist check

        app.get("/packageExistCheck/:email", async (req, res) => {
            const email = req.params.email;

            const query = { email: email };

            const result = await userCollections.findOne(query);

            let packageExists = false;
            console.log("package exist result", result);
            if (result) {

                if (result?.package) {
                    packageExists = true;
                }
            }
            // console.log("checking package exist or not",packageExists);

            res.send({ packageExists });
        })


        // employee myprofile data get and update

        app.get("/employeeMyProfileData/:email", async (req, res) => {
            const email = req.params.email;

            const query = { registerEmail: email };

            const result = await userCollections.findOne(query);

            res.send(result);
        })

        app.patch("/employeeUpDatingMyProfileData/:email", async (req, res) => {
            const email = req.params.email;
            const updatingInfo = req.body;

            const query = { registerEmail: email };

            const updateDatas = {
                $set: {
                    registerName: updatingInfo.name,
                    registerDateOfBirth: updatingInfo.birthDate
                }
            };

            const result = await userCollections.updateOne(query, updateDatas);
            res.send(result);
        })

        // get asset on update page
        app.get("/getAssetInfo/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollections.findOne(query);

            res.send(result);
        })
        // asset update by admin
        app.put("/updateAsset/:id", async (req, res) => {
            const assetId = req.params.id;

            const assetInfos = req.body;
            console.log(assetId, assetInfos);

            const query = { _id: new ObjectId(assetId) };

            const updateFields = {
                assetName: assetInfos.assetName,
                assetQuantity: parseInt(assetInfos.assetQuantity),
                assetType: assetInfos.assetType
            };
        
        
            if (assetInfos.assetImage) {
                updateFields.assetImage = assetInfos.assetImage;
            }

            const updateDoc = {

                $set: updateFields
            }
            // console.log(assetInfos, "updating assetinfos")
            const result = await productCollections.updateOne(query, updateDoc);
            res.send(result);
        })

        // asset delete by admin

        app.delete("/assetDataDelete/:id", async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };

            const result = await productCollections.deleteOne(query);
            res.send(result);
        })


        //

        app.put("/customReqAssetUpdateSave/:id", async (req, res) => {
            const id = req.params.id;

            const updatingDataInfos = req.body;
            // console.log(id, updatingDataInfos);
            const query = { _id: new ObjectId(id) };

            const updateDoc = {

                $set: {
                    assetName: updatingDataInfos.assetName,
                    assetImage: updatingDataInfos.assetImage,
                    assetType: updatingDataInfos.assetType,
                    assetPrice: updatingDataInfos.assetPrice,
                    whyNeed: updatingDataInfos.whyNeed,
                    additionalInfo: updatingDataInfos.additionalInfo
                }

            }
            // console.log(updateDoc);



            const result = await customRequestAssetCollections.updateOne(query, updateDoc);

            res.send(result);
        })

        // max 5 pending requests for admin

        app.get("/maxFivePendingRqst/:email", async (req, res) => {
            const email = req.params.email;

            const query = {
                adminEmail: email,
                status: { $exists: false }
            };

            const result = await requestAssetCollections.find(query).limit(5).toArray();

            res.send(result);
        })

        // my pending request

        app.get("/employersPendingRqst/:email", async (req, res) => {
            const email = req.params.email;

            const query = { requesterEmail: email,
                status: {$exists: false}
            };
            

            const result = await requestAssetCollections.find(query).toArray();

            res.send(result);
        })

        app.get("/myAssetsSearchOperation/:email", async (req, res) => {
            const email = req.params.email;

            const query = {
                requesterEmail: email,

            };

            const query2 = req?.query;

            console.log(query2);

            if (query2?.searching && query2.searching.length !== 0) {
                query.assetName = { $regex: query2.searching, $options: 'i' };
            }

            const result = await requestAssetCollections.find(query).toArray();

            res.send(result);
        })

        app.get("/myAssetsFilteringOperation/:email", async (req, res) => {
            const email = req.params.email;

            const query = {
                requesterEmail: email,
            };

            console.log(email)
            const query2 = req?.query;



            if (query2?.filtering == 'Returnable') {

                query.assetType = 'Returnable';
            }
            else if (query2?.filtering == 'Non-returnable') {
                query.assetType = 'Non-returnable';
            }
            else if (query2?.filtering == 'Pending') {
                query.$or = [{ status: { $exists: false } }, { status: null }];
            }
            else if (query2?.filtering == 'Approved') {
                query.status = 'Approved';
            }


            console.log(query)

            const result = await requestAssetCollections.find(query).toArray();
            // console.log(result);
            res.send(result);

        })

        // employe request assets page search

        app.get("/employeRqstAsstsSearchOperation/:email", async (req, res) => {
            const email = req.params.email;

            const query = {
                email: email,

            };

            const query2 = req?.query;

            console.log(query2);

            if (query2?.searching && query2.searching.length !== 0) {
                query.assetName = { $regex: query2.searching, $options: 'i' };

            }


            const result = await productCollections.find(query).toArray();

            res.send(result);

        })

        // now filtering request assets page

        app.get("/employeeRqstAsstsfilterOperation/:email", async (req, res) => {
            const email = req.params.email;

            const query = { email: email, };

            const query2 = req?.query;

            console.log(query2);

            if (query2?.filtering == 'available') {
                query.assetQuantity = { $gt: 0 };
            }
            else if (query2?.filtering == 'stockOut') {
                query.assetQuantity = { $lt: 1 };
            }

            const result = await productCollections.find(query).toArray();

            res.send(result);
        })

        // add marked member to the team and change role to employee

        app.post("/addMarkedToTeam", async (req, res) => {
            const membersData = req.body;
            console.log("membersdata",membersData);

            const membersArray = Object.values(membersData);
            console.log("membersarray", membersArray)
            const updateDoc = {
                $set: {
                    role: "employee"
                }
            }
            const result1 = await userCollections.updateMany({ _id: { $in: membersArray.map(object => new ObjectId(object?.userId)) } }, updateDoc);

            const result2 = await teamCollections.insertMany(membersArray);

            res.send({ result1, result2 });
        })


        app.patch("/markedDecreasePackageLimit/:email/:idsCount", async (req, res) => {
            const email = req.params.email;
            const idsCount = req.params.idsCount;
            console.log(idsCount);
            const query = { email: email };

            const updateDoc = {
                $inc: {
                    currentPackageLimit: -idsCount,
                }
            };

            const result = await userCollections.updateOne(query, updateDoc);

            res.send(result);
        })


        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
