// apps/api/src/modules/cms/cms.module.ts
import { Module } from '@nestjs/common';
import { PagesService } from './pages.service';
import { PagesController } from './pages.controller';
import { SectionsService } from './sections.service';
import { SectionsController } from './sections.controller';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { PopupsService } from './popups.service';
import { PopupsController } from './popups.controller';
import { MediaLibraryService } from './media-library.service';
import { MediaLibraryController } from './media-library.controller';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { HomeFeedService } from './home-feed.service';
import { HomeFeedController } from './home-feed.controller';

@Module({
  controllers: [
    PagesController,
    SectionsController,
    MenusController,
    AnnouncementsController,
    PopupsController,
    MediaLibraryController,
    ContactController,
    HomeFeedController,
  ],
  providers: [
    PagesService,
    SectionsService,
    MenusService,
    AnnouncementsService,
    PopupsService,
    MediaLibraryService,
    ContactService,
    HomeFeedService,
  ],
  exports: [
    PagesService,
    SectionsService,
    MenusService,
    AnnouncementsService,
    PopupsService,
    MediaLibraryService,
    ContactService,
    HomeFeedService,
  ],
})
export class CmsModule {}