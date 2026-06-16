import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  //CREATE API for creating a new organization
  @ApiOperation({
    summary: 'Create a new organization',
    description: 'Creates a new organization in the platform',
  })
  @ApiBody({
    type: CreateOrganizationDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @Post()
  create(
    @Req() req: Request & { user: any },
    @Body() createOrganizationDto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(req.user.id, createOrganizationDto);
  }

  //GET APIs for fetching all organizations and fetching organization by ID
  @ApiOperation({
    summary: 'Get all organizations',
    description: 'Fetch all organizations from the platform.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations fetched successfully.',
  })
  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  //GET API for fetching organizations where the logged-in user is a member
  @ApiOperation({
    summary: 'Get my organizations',
    description: 'Fetch organizations where the logged-in user is a member.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations fetched successfully.',
  })
  @Get('my')
  findMyOrganizations(@Req() req: Request & { user: any }) {
    return this.organizationsService.findMyOrganizations(req.user.id);
  }

  //GET API for fetching organization by ID
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Fetch a single organization by its unique ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the organization',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization fetched successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found.',
  })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.findOne(id);
  }
  //PATCH API for updating organization details
  @ApiOperation({
    summary: 'Update an organization',
    description: 'Updates the details of an existing organization.',
  })
  @ApiBody({ type: UpdateOrganizationDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  //DELETE API for deleting an organization
  @ApiOperation({
    summary: 'Delete an organization',
    description: 'Deletes an organization from the platform.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the organization to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found.',
  })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.remove(id);
  }
}
