insert into notifications (date, headline, posted_by, body)
values ('2015-04-11', 'Aerotech DMS Motor Thrust Ring Advisory', 1,
'It has come to our attention that there have been two (2) reported instances of the factory glued on thrust rings of 54mm DMS Disposable Motor System single-use rocket motors breaking off the motor casing during flight. One was a K535W, and the other was an L1000W that was flown at the recent Midwest Power launch. This usually results in the bare motor flying through the rocket and into the air, often in an unstable and unpredictable manner.

Customers are requested to NOT fly 54mm DMS motors using only the factory installed thrust ring and to take one of the following steps before flight to mitigate this problem:

1. Tightly wrap two layers of 1” wide masking tape around the thrust ring and motor case junction, and tightly friction fit the motor into the motor mount tube with masking tape. Using this method, the flyer should still be able to make use of their rocket’s existing motor retainer system.

2. Tightly wrap a layer of 1” wide masking tape around the motor case immediately adjacent to the thrust ring, to a thickness of 1/16”. Install the motor in the motor mount tube and tightly wrap 2 layers of masking tape around the motor and motor mount tube or motor retainer junction.

3. Remove the glued-on thrust ring and tightly wrap a layer of 1” wide masking tape around the motor case, flush with the nozzle end of the case, to a thickness of 1/16”. Install the motor in the motor mount tube and tightly wrap 2 layers of masking tape around the motor and motor mount tube or motor retainer junction.

4. Use a motor block within the motor mount tube that will transfer the thrust of the motor to the airframe and prevent the forward movement of the motor within the tube. Install the motor in the motor mount tube and tightly wrap 2 layers of masking tape around the motor and motor mount tube or motor retainer junction.

Two of these methods can be viewed on a YouTube video posted at:

https://youtu.be/qii-t7RbpMk

AeroTech is continuing to examine and evaluate the situation and is actively working on a solution that we believe will conclusively solve the problem in the near future. Until then, new production 54mm DMS motors will be shipped without thrust rings and customers will need to apply their own tape thrust rings or use a motor block per steps 3 or 4 above. We are sorry for any inconvenience this may have caused for our dealers and customers. Your understanding and patience is appreciated, and we thank you for your continued support.
');

\lo_import '2016-Bulletin-Pro38-Forward-Closure.pdf' '2016-Bulletin-Pro38-Forward-Closure.pdf'
insert into documents (filename, content_type, uploaded_by, content_oid)
values ('2016-Bulletin-Pro38-Forward-Closure.pdf', 'application/pdf', 1, :LASTOID)
;
insert into notifications (date, headline, posted_by, document_name)
values ('2016-06-15', 'Cesaroni Bulletin: Forward Closure', 1, '2016-Bulletin-Pro38-Forward-Closure.pdf')
;

insert into notifications (date, headline, posted_by, body)
values ('2017-08-03', 'Aerotech M1350 DMS recall', 1,
 'The fiberglass casings were wound incorrectly and can fail during operation.
Launch organizers should not allow any M1350W DMS motors to be flown with lot codes ending in either a 6 or 7 (2016)(2017). This does affect earlier versions with lot codes ending in 5 (2015).

Fliers possessing the impacted M1350 DMS motors should contact their motor dealer or Aerotech for further instructions.

06/28/2017

Dear AeroTech Retailer,

We have recently received reports of a very small number of case failures of the 54mm J450DM and L1000W, and the 75mm M1350W.

After investigation, we discovered that the wind angle on the fiberglass cases used in these motors is out of specification. This reduces the strength of the case and could result in an increased incidence of motor failures.

Please pull any of the above mentioned motors from your stock that have been received since January 1, 2016. Also, return the M1350W case assemblies (nozzle, case & liner) you currently have to AeroTech/RCS as soon as possible. Do not sell any of the M1350Ws until the case assemblies have been replaced.

Please contact any customers you may have sold these to and let them know so they can be replaced if not already used.

Let us know the number of these motors that you have in stock and we will send you replacements as soon as possible.

We apologize for the inconvenience, and thank you for your continued support.

Thank you for your orders and continued representation of the AeroTech products.

Customer Service
RCS Rocket Motor Components, Inc.
AeroTech, ISP & Quest Divisions');

\lo_import 'Bulletin_Pro38_1G_Pellet_Issue_v1.2.pdf' 'Bulletin_Pro38_1G_Pellet_Issue_v1.2.pdf'
insert into documents (filename, content_type, uploaded_by, content_oid)
values ('Bulletin_Pro38_1G_Pellet_Issue_v1.2.pdf', 'application/pdf', 1, :LASTOID)
;
insert into notifications (date, headline, posted_by, document_name)
values ('2019-04-15', 'Cesaroni Bulletin: 1G Failures', 1, 'Bulletin_Pro38_1G_Pellet_Issue_v1.2.pdf')
;

insert into notifications (date, headline, posted_by, body)
values ('2020-10-01', 'Pro29 3G Mellow Failures', 1,
'It has been brought to the attention of Cesaroni Technology Inc over the past few weeks that there has been a high
failure rate on Pro29-3G Mellow reloads. We have been looking into this matter and have verified the anomaly
which stems from an over-pressurization at ignition resulting in nozzle and/or forward closure blowouts.
Upon investigation it appears the cause is primarily due to an overly large ignition pellet. The issue is only in this one
specific motor/reload (i.e. 143G33-9A), the rest of the Pro29 lineup is unaffected.
Unfortunately, it appears the pellet supplied during assembly of the Pro 29-3G mellow reload was too large. Due to
the small throat of the nozzle in combination with the excess gas flow from the pellet, this can cause an over
pressurization of the motor resulting in failure. CTI has already made corrective measures for all reloads/motors sent
to dealers from October 1, 2020 onwards.

Full announcement:
http://www.pro38.com/pdfs/Bulletin-Pro29_%203G_Mellow_Pellet_Issue_v1.1.pdf

Pellet modification instructions:
http://www.pro38.com/pdfs/Bulletin-Pro29_%203G_Mellow_Pellet_Issue_v1.1.pdf');

insert into notifications (date, headline, posted_by, body)
values ('2020-10-29', 'Aerotech I170G Delay Length', 1,
'TMT has been working with Aerotech to clear up some confusion about the length of the unmodified delay element on the Aerotech I170G, a one-grain 54mm reload kit designed for the 54/426 hardware. We have found that the reload kits sold until the present time have been released with a 10 second unmodified delay element, instead of the labeled 14 seconds. This error includes all of the I170G kits with lot codes up to and including 051220-07. AT estimates that approximately 70 of these reload kits have been sold to dealers. They are working to inform all users and dealers about this problem, in the AT catalogue, and on their facebook page.

And, since all of the other 54/426 reloads have 14 second unmodified delay elements, all future I170G packages leaving the factory will contain 14 second delay elements. This will include all motors with the lot code 072220-07 and all lots with later manufacturing dates.
IF you have any I170G reload kits in your box, please check the lot codes and make sure you know the delay element timing for your specific kit.

Alan Whitmore
Chair, TMT');

insert into notifications (date, headline, posted_by, body)
values ('2022-09-13', 'CTI Pro54 2G LB motors', 1,
'Pro54 2G LB motors

Sep 13 2022​

Cesaroni Technology Inc has noticed that there has been a higher failure rate than normally expected on Pro54 2G SK (J145) reloads. We have been looking into this matter and have verified the anomaly which stems from an over-pressurization after ignition.

Upon investigation it appears the cause is due to the tape around the igniter pellet plugging the bore of the nozzle upon ignition.

From here forward the Pro 54 2G Skidmark (699J145-19A) and 2G Red Lightning motors (614I100-17A) will no longer have an ignition pellet but instead will have a dipped igniter, like our larger Pro 54 LB motors.

However, to address all the affected reloads currently in circulation CTI has approved a small “in-field” modification to fix the issue. This modification can be done by the end-user during preparation for launch and simply involves removing the ignition pellet and replacing the supplied e-match. CTI has successfully conducted an entire series of motor testing with this modification. We also hope that if any end-user of these affected reloads does not feel comfortable conducting this modification themselves, they can seek the assistance of any ProX dealers at the launch site during preparation for flight. Furthermore, the current e-match supplied with the reloads will not be sufficient to ignite the motor without a pellet, therefore a typical “pyrogen type” igniter will be required. We will supply a number of these igniters to our ProX dealers to give out with the reloads that haven’t yet been modified.

A copy of the in-field modification instructions is included with this bulletin and can also be found on our website. It will also be supplied to the ProX dealers for public distribution.

Instructions for Pro54 2G LB motors

Pellet Removal

Sep 13, 2022​

Cesaroni Technology Inc has noticed that there has been a higher failure rate than normally expected on Pro54 2G SK (J145) reloads. We have been looking into this matter and have verified the anomaly which stems from an over-pressurization after ignition.

Upon investigation it appears the cause is due to the tape around the igniter pellet plugging the bore of the nozzle upon ignition. To fix the issue, the pellet must be removed from the motor grain. All motors with propellant manufacturing date after September 15, 2022, will have already been modified and be identified with a CTI “QC Approved” sticker attached to the reload packaging. Motors that have a “Pellet Removal Required” or no label will need to remove the pellet.

To remove the pellet from the motor grain, begin by unpackaging the reload and remove either the forward closure or aft closure (nozzle) from the phenolic liner. Then remove the propellant grain from the phenolic liner.

Next, remove the pellet from the grain. To conduct this procedure, use an instrument/tool which can be inserted through the aft bore of the grain. This will assist in pushing the pellet out the top/forward of the grain. Apply a constant pressure evenly on this tool to extract the pellet. DO NOT bang, hammer, pound, etc. on the pellet since they are brittle. Only a few pounds of force are required to dislodge the pellet. The instrument/tool can be any rod with a smaller diameter than the bore of the propellant grain (i.e. Ø1/2in). The instrument/tool MUST have a flat top (such as the back of pen, wooden dowel, etc). Ensure it is not pointed or sharp which may cause the brittle pellet to break up. After removal replace the grain into the phenolic liner and replace the forward closure and/or nozzle that was previously removed. Then proceed to assemble the motor as per the instructions, after adjusting the delay if required.

Furthermore, the current e-match supplied with the reloads will not be sufficient to ignite the motor without a pellet, therefore a typical “pyrogen type” igniter will be required. A number of igniters will be supplied to the dealers for customers who have already purchased reloads previously.

Dealers Inventory:

To address the ProX dealers’ current inventory of motors (Pro 54 2G SK & RL) that are affected but not yet sold to the public, CTI is asking all dealers to place a label on the affected reload packaging identifying it as requiring the “in-field modification”. CTI can supply any dealers with either an electronic copy of label details for immediate printing or CTI can ship the label direct for them to be applied (at our cost). Please inform your CTI representative of which method works best for your time/schedule.

In addition, all future Pro 54 2G SK & RL reloads manufactured by CTI after September 15, 2022, will have an additional label (“QC Approved”) placed on the packaging identifying it as not requiring the in-field modification.

This will be done to reduce confusion between future reloads. We will keep this identification process in place for the next 2 years (or longer if deemed necessary).

We sincerely apologize for any inconvenience or hobby rockets that have been affected by this issue. For any hobby rocket failures in flight that occurred because of this pellet issue please follow the regular warranty process by contacting your ProX dealer. The dealers will then provide all the details to CTI so we can ensure you receive the appropriate warranty.

Sincerely,
Cesaroni Technology Inc
2561 Stouffville Road
Gormley, Ontario
L0H 1G0
Phone: 905-887-2370
Fax: 905-887-2375b
Site: www.cesaroni.net www.pro38.com');
