warning: in the working copy of 'Backend/prisma/schema.prisma', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/Backend/prisma/schema.prisma b/Backend/prisma/schema.prisma[m
[1mindex fcc3ee6..66a21b1 100644[m
[1m--- a/Backend/prisma/schema.prisma[m
[1m+++ b/Backend/prisma/schema.prisma[m
[36m@@ -6,66 +6,20 @@[m [mdatasource db {[m
   provider = "postgresql"[m
 }[m
 [m
[31m-//  Enums[m
[31m-[m
[31m-enum ImageSource {[m
[31m-  LOCAL[m
[31m-  GOOGLE_PHOTOS[m
[31m-}[m
[31m-[m
[31m-enum ImageProcessingStatus {[m
[31m-  PENDING[m
[31m-  PROCESSING[m
[31m-  COMPLETED[m
[31m-  FAILED[m
[31m-}[m
[31m-[m
[31m-enum DuplicateType {[m
[31m-  EXACT[m
[31m-  NEAR[m
[31m-}[m
[31m-[m
[31m-enum JobType {[m
[31m-  HASH[m
[31m-  EMBEDDING[m
[31m-  OCR[m
[31m-  FACE[m
[31m-  CATEGORY[m
[31m-  CLUSTER[m
[31m-  EVENT[m
[31m-}[m
[31m-[m
[31m-enum JobStatus {[m
[31m-  QUEUED[m
[31m-  RUNNING[m
[31m-  COMPLETED[m
[31m-  FAILED[m
[31m-}[m
[31m-[m
[31m-enum EventJobStatus {[m
[31m-  QUEUED[m
[31m-  RUNNING[m
[31m-  COMPLETED[m
[31m-  FAILED[m
[31m-}[m
[31m-[m
[31m-// Models [m
[31m-[m
 model User {[m
[31m-  id           String   @id @default(uuid())[m
[31m-  email        String   @unique[m
[31m-  passwordHash String?  @map("password_hash")[m
[31m-  name         String[m
[31m-  avatarUrl    String?  @map("avatar_url")[m
[31m-  createdAt    DateTime @default(now()) @map("created_at")[m
[31m-  updatedAt    DateTime @updatedAt @map("updated_at")[m
[31m-[m
[31m-  googleAccount   GoogleAccount?[m
[31m-  images          Image[][m
[32m+[m[32m  id              String           @id @default(uuid())[m
[32m+[m[32m  email           String           @unique[m
[32m+[m[32m  passwordHash    String?          @map("password_hash")[m
[32m+[m[32m  name            String[m
[32m+[m[32m  avatarUrl       String?          @map("avatar_url")[m
[32m+[m[32m  createdAt       DateTime         @default(now()) @map("created_at")[m
[32m+[m[32m  updatedAt       DateTime         @updatedAt @map("updated_at")[m
   duplicateGroups DuplicateGroup[][m
[31m-  faceClusters    FaceCluster[][m
   eventJobs       EventJob[][m
   events          Event[][m
[32m+[m[32m  faceClusters    FaceCluster[][m
[32m+[m[32m  googleAccount   GoogleAccount?[m
[32m+[m[32m  images          Image[][m
 [m
   @@map("users")[m
 }[m
[36m@@ -79,68 +33,42 @@[m [mmodel GoogleAccount {[m
   tokenExpiry  DateTime @map("token_expiry")[m
   connectedAt  DateTime @default(now()) @map("connected_at")[m
   updatedAt    DateTime @updatedAt @map("updated_at")[m
[31m-[m
[31m-  user User @relation(fields: [userId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)[m
 [m
   @@map("google_accounts")[m
 }[m
 [m
 model Image {[m
[31m-  id String @id @default(uuid())[m
[31m-[m
[31m-  userId String @map("user_id")[m
[31m-[m
[31m-  filename String[m
[31m-[m
[31m-  cloudinaryId  String @map("cloudinary_id")[m
[31m-  cloudinaryUrl String @map("cloudinary_url")[m
[31m-[m
[31m-  // small preview of image, thumbnail can be generated using cloudinaryUrl[m
[31m-[m
[31m-  width  Int?[m
[31m-  height Int?[m
[31m-[m
[31m-  fileSize BigInt? @map("file_size")[m
[31m-  mimeType String? @map("mime_type")[m
[31m-[m
[31m-  sha256Hash String? @map("sha256_hash")[m
[31m-  phash      String?[m
[31m-[m
[31m-  source ImageSource @default(LOCAL)[m
[31m-[m
[31m-  googlePhotosId String? @map("google_photos_id")[m
[31m-[m
[31m-  takenAt DateTime? @map("taken_at")[m
[31m-[m
[31m-  locationLat Decimal? @map("location_lat") @db.Decimal(9, 6)[m
[31m-  locationLng Decimal? @map("location_lng") @db.Decimal(9, 6)[m
[31m-[m
[31m-  metadata Json?[m
[31m-[m
[31m-  processingStatus ImageProcessingStatus @default(PENDING) @map("processing_status")[m
[31m-[m
[31m-  createdAt DateTime @default(now()) @map("created_at")[m
[31m-  updatedAt DateTime @updatedAt @map("updated_at")[m
[31m-[m
[31m-  // Optional soft delete[m
[31m-  deletedAt DateTime? @map("deleted_at")[m
[31m-[m
[31m-  user User @relation(fields: [userId], references: [id], onDelete: Cascade)[m
[31m-[m
[31m-  imageCategories ImageCategory[][m
[31m-[m
[31m-  duplicateMembers DuplicateGroupMember[][m
[31m-[m
[31m-  representativeFor DuplicateGroup[] @relation("RepresentativeImage")[m
[31m-[m
[31m-  faces Face[][m
[31m-[m
[31m-  ocrRecord OcrRecord?[m
[31m-[m
[31m-  processingJobs ProcessingJob[][m
[31m-[m
[31m-  eventImages    EventImage[][m
[31m-  coverForEvents Event[]      @relation("EventCoverImage")[m
[32m+[m[32m  id                String                 @id @default(uuid())[m
[32m+[m[32m  userId            String                 @map("user_id")[m
[32m+[m[32m  filename          String[m
[32m+[m[32m  cloudinaryId      String                 @map("cloudinary_id")[m
[32m+[m[32m  cloudinaryUrl     String                 @map("cloudinary_url")[m
[32m+[m[32m  width             Int?[m
[32m+[m[32m  height            Int?[m
[32m+[m[32m  fileSize          BigInt?                @map("file_size")[m
[32m+[m[32m  mimeType          String?                @map("mime_type")[m
[32m+[m[32m  sha256Hash        String?                @map("sha256_hash")[m
[32m+[m[32m  phash             String?[m
[32m+[m[32m  source            ImageSource            @default(LOCAL)[m
[32m+[m[32m  googlePhotosId    String?                @map("google_photos_id")[m
[32m+[m[32m  takenAt           DateTime?              @map("taken_at")[m
[32m+[m[32m  locationLat       Decimal?               @map("location_lat") @db.Decimal(9, 6)[m
[32m+[m[32m  locationLng       Decimal?               @map("location_lng") @db.Decimal(9, 6)[m
[32m+[m[32m  metadata          Json?[m
[32m+[m[32m  processingStatus  ImageProcessingStatus  @default(PENDING) @map("processing_status")[m
[32m+[m[32m  createdAt         DateTime               @default(now()) @map("created_at")[m
[32m+[m[32m  updatedAt         DateTime               @updatedAt @map("updated_at")[m
[32m+[m[32m  deletedAt         DateTime?              @map("deleted_at")[m
[32m+[m[32m  duplicateMembers  DuplicateGroupMember[][m
[32m+[m[32m  representativeFor DuplicateGroup[]       @relation("RepresentativeImage")[m
[32m+[m[32m  eventImages       EventImage[][m
[32m+[m[32m  coverForEvents    Event[]                @relation("EventCoverImage")[m
[32m+[m[32m  faces             Face[][m
[32m+[m[32m  imageCategories   ImageCategory[][m
[32m+[m[32m  user              User                   @relation(fields: [userId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  ocrRecord         OcrRecord?[m
[32m+[m[32m  processingJobs    ProcessingJob[][m
 [m
   @@unique([userId, cloudinaryId])[m
   @@index([userId])[m
[36m@@ -154,10 +82,9 @@[m [mmodel Image {[m
 }[m
 [m
 model Category {[m
[31m-  id    Int    @id @default(autoincrement())[m
[31m-  slug  String @unique[m
[31m-  label String[m
[31m-[m
[32m+[m[32m  id              Int             @id @default(autoincrement())[m
[32m+[m[32m  slug            String          @unique[m
[32m+[m[32m  label           String[m
   imageCategories ImageCategory[][m
 [m
   @@map("categories")[m
[36m@@ -167,9 +94,8 @@[m [mmodel ImageCategory {[m
   imageId    String   @map("image_id")[m
   categoryId Int      @map("category_id")[m
   confidence Decimal? @db.Decimal(4, 3)[m
[31m-[m
[31m-  image    Image    @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
[31m-  category Category @relation(fields: [categoryId], references: [id])[m
[32m+[m[32m  category   Category @relation(fields: [categoryId], references: [id])[m
[32m+[m[32m  image      Image    @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
 [m
   @@id([imageId, categoryId])[m
   @@index([categoryId])[m
[36m@@ -177,31 +103,28 @@[m [mmodel ImageCategory {[m
 }[m
 [m
 model DuplicateGroup {[m
[31m-  id                    String        @id @default(uuid())[m
[31m-  userId                String        @map("user_id")[m
[32m+[m[32m  id                    String                 @id @default(uuid())[m
[32m+[m[32m  userId                String                 @map("user_id")[m
   type                  DuplicateType[m
[31m-  representativeImageId String?       @map("representative_image_id")[m
[31m-  createdAt             DateTime      @default(now()) @map("created_at")[m
[31m-  updatedAt             DateTime      @updatedAt @map("updated_at")[m
[31m-[m
[31m-  user                User                   @relation(fields: [userId], references: [id], onDelete: Cascade)[m
[31m-  representativeImage Image?                 @relation("RepresentativeImage", fields: [representativeImageId], references: [id], onDelete: SetNull)[m
[31m-  members             DuplicateGroupMember[][m
[32m+[m[32m  representativeImageId String?                @map("representative_image_id")[m
[32m+[m[32m  createdAt             DateTime               @default(now()) @map("created_at")[m
[32m+[m[32m  updatedAt             DateTime               @updatedAt @map("updated_at")[m
[32m+[m[32m  members               DuplicateGroupMember[][m
[32m+[m[32m  representativeImage   Image?                 @relation("RepresentativeImage", fields: [representativeImageId], references: [id])[m
[32m+[m[32m  user                  User                   @relation(fields: [userId], references: [id], onDelete: Cascade)[m
 [m
   @@index([userId])[m
   @@map("duplicate_groups")[m
 }[m
 [m
 model DuplicateGroupMember {[m
[31m-  groupId String @map("group_id")[m
[31m-  imageId String @map("image_id")[m
[31m-[m
[31m-  group DuplicateGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)[m
[31m-  image Image          @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  groupId String         @map("group_id")[m
[32m+[m[32m  imageId String         @map("image_id")[m
[32m+[m[32m  group   DuplicateGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  image   Image          @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
 [m
   @@id([groupId, imageId])[m
   @@map("duplicate_group_members")[m
[31m-  @@index([imageId])[m
 }[m
 [m
 model FaceCluster {[m
[36m@@ -211,9 +134,8 @@[m [mmodel FaceCluster {[m
   coverFaceId String?  @map("cover_face_id")[m
   createdAt   DateTime @default(now()) @map("created_at")[m
   updatedAt   DateTime @updatedAt @map("updated_at")[m
[31m-[m
[31m-  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)[m
[31m-  faces Face[][m
[32m+[m[32m  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  faces       Face[][m
 [m
   @@index([userId])[m
   @@map("face_clusters")[m
[36m@@ -232,8 +154,8 @@[m [mmodel Face {[m
   createdAt      DateTime     @default(now()) @map("created_at")[m
   updatedAt      DateTime     @updatedAt @map("updated_at")[m
   qdrantId       String       @unique @map("qdrant_id")[m
[32m+[m[32m  cluster        FaceCluster? @relation(fields: [clusterId], references: [id])[m
   image          Image        @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
[31m-  cluster        FaceCluster? @relation(fields: [clusterId], references: [id], onDelete: SetNull)[m
 [m
   @@index([imageId])[m
   @@index([clusterId])[m
[36m@@ -241,15 +163,15 @@[m [mmodel Face {[m
 }[m
 [m
 model OcrRecord {[m
[31m-  id         String   @id @default(uuid())[m
[31m-  imageId    String   @unique @map("image_id")[m
[31m-  rawText    String   @map("raw_text")[m
[32m+[m[32m  id         String                   @id @default(uuid())[m
[32m+[m[32m  imageId    String                   @unique @map("image_id")[m
[32m+[m[32m  rawText    String                   @map("raw_text")[m
   language   String?[m
[31m-  confidence Decimal? @db.Decimal(4, 3)[m
[31m-  createdAt  DateTime @default(now()) @map("created_at")[m
[31m-  updatedAt  DateTime @updatedAt @map("updated_at")[m
[31m-[m
[31m-  image Image @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  confidence Decimal?                 @db.Decimal(4, 3)[m
[32m+[m[32m  createdAt  DateTime                 @default(now()) @map("created_at")[m
[32m+[m[32m  updatedAt  DateTime                 @updatedAt @map("updated_at")[m
[32m+[m[32m  textSearch Unsupported("tsvector")? @default(dbgenerated("to_tsvector('english'::regconfig, raw_text)")) @map("text_search")[m
[32m+[m[32m  image      Image                    @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
 [m
   @@map("ocr_records")[m
 }[m
[36m@@ -264,8 +186,7 @@[m [mmodel ProcessingJob {[m
   queuedAt    DateTime  @default(now()) @map("queued_at")[m
   startedAt   DateTime? @map("started_at")[m
   completedAt DateTime? @map("completed_at")[m
[31m-[m
[31m-  image Image @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  image       Image     @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
 [m
   @@unique([imageId, jobType])[m
   @@index([imageId])[m
[36m@@ -283,8 +204,7 @@[m [mmodel EventJob {[m
   queuedAt    DateTime       @default(now()) @map("queued_at")[m
   startedAt   DateTime?      @map("started_at")[m
   completedAt DateTime?      @map("completed_at")[m
[31m-[m
[31m-  user User @relation(fields: [userId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)[m
 [m
   @@index([userId])[m
   @@index([status])[m
[36m@@ -292,22 +212,20 @@[m [mmodel EventJob {[m
 }[m
 [m
 model Event {[m
[31m-  id           String    @id @default(uuid())[m
[31m-  userId       String    @map("user_id")[m
[32m+[m[32m  id           String       @id @default(uuid())[m
[32m+[m[32m  userId       String       @map("user_id")[m
   title        String[m
[31m-  coverImageId String?   @map("cover_image_id")[m
[31m-  startAt      DateTime? @map("start_at")[m
[31m-  endAt        DateTime? @map("end_at")[m
[31m-  locationLat  Decimal?  @map("location_lat") @db.Decimal(9, 6)[m
[31m-  locationLng  Decimal?  @map("location_lng") @db.Decimal(9, 6)[m
[32m+[m[32m  coverImageId String?      @map("cover_image_id")[m
[32m+[m[32m  startAt      DateTime?    @map("start_at")[m
[32m+[m[32m  endAt        DateTime?    @map("end_at")[m
[32m+[m[32m  locationLat  Decimal?     @map("location_lat") @db.Decimal(9, 6)[m
[32m+[m[32m  locationLng  Decimal?     @map("location_lng") @db.Decimal(9, 6)[m
   metadata     Json?[m
[31m-[m
[31m-  createdAt DateTime @default(now()) @map("created_at")[m
[31m-  updatedAt DateTime @updatedAt @map("updated_at")[m
[31m-[m
[31m-  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)[m
[31m-  coverImage  Image?       @relation("EventCoverImage", fields: [coverImageId], references: [id], onDelete: SetNull)[m
[31m-  eventImages EventImage[][m
[32m+[m[32m  createdAt    DateTime     @default(now()) @map("created_at")[m
[32m+[m[32m  updatedAt    DateTime     @updatedAt @map("updated_at")[m
[32m+[m[32m  eventImages  EventImage[][m
[32m+[m[32m  coverImage   Image?       @relation("EventCoverImage", fields: [coverImageId], references: [id])[m
[32m+[m[32m  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)[m
 [m
   @@index([userId])[m
   @@index([userId, startAt])[m
[36m@@ -317,11 +235,51 @@[m [mmodel Event {[m
 model EventImage {[m
   eventId String @map("event_id")[m
   imageId String @map("image_id")[m
[31m-[m
[31m-  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)[m
[31m-  image Image @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)[m
[32m+[m[32m  image   Image  @relation(fields: [imageId], references: [id], onDelete: Cascade)[m
 [m
   @@id([eventId, imageId])[m
   @@index([imageId])[m
   @@map("event_images")[m
 }[m
[32m+[m
[32m+[m[32menum ImageSource {[m
[32m+[m[32m  LOCAL[m
[32m+[m[32m  GOOGLE_PHOTOS[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32menum ImageProcessingStatus {[m
[32m+[m[32m  PENDING[m
[32m+[m[32m  PROCESSING[m
[32m+[m[32m  COMPLETED[m
[32m+[m[32m  FAILED[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32menum DuplicateType {[m
[32m+[m[32m  EXACT[m
[32m+[m[32m  NEAR[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32menum JobType {[m
[32m+[m[32m  HASH[m
[32m+[m[32m  EMBEDDING[m
[32m+[m[32m  OCR[m
[32m+[m[32m  FACE[m
[32m+[m[32m  CATEGORY[m
[32m+[m[32m  CLUSTER[m
[32m+[m[32m  EVENT[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32menum JobStatus {[m
[32m+[m[32m  QUEUED[m
[32m+[m[32m  RUNNING[m
[32m+[m[32m  COMPLETED[m
[32m+[m[32m  FAILED[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32menum EventJobStatus {[m
[32m+[m[32m  QUEUED[m
[32m+[m[32m  RUNNING[m
[32m+[m[32m  COMPLETED[m
[32m+[m[32m  FAILED[m
[32m+[m[32m}[m
