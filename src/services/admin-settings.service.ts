import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Setting } from "../entities";
import { RegistrationSettingsDto } from "../dto/admin-settings.dto";

const REGISTRATION_SETTINGS_KEY = "registration";

const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettingsDto = {
  id: { min: 6, max: 16 },
  nickname: { min: 3, max: 16 },
  password: { min: 8, max: 16 },
};

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>
  ) {}

  async getRegistrationSettings(): Promise<RegistrationSettingsDto> {
    const existing = await this.settingRepository.findOne({
      where: { key: REGISTRATION_SETTINGS_KEY },
    });

    if (!existing) {
      return DEFAULT_REGISTRATION_SETTINGS;
    }

    return {
      ...DEFAULT_REGISTRATION_SETTINGS,
      ...(existing.value as RegistrationSettingsDto),
    };
  }

  async updateRegistrationSettings(
    payload: RegistrationSettingsDto
  ): Promise<RegistrationSettingsDto> {
    const merged = {
      ...DEFAULT_REGISTRATION_SETTINGS,
      ...payload,
    };

    let record = await this.settingRepository.findOne({
      where: { key: REGISTRATION_SETTINGS_KEY },
    });

    if (!record) {
      record = this.settingRepository.create({
        key: REGISTRATION_SETTINGS_KEY,
        value: merged,
      });
    } else {
      record.value = merged;
    }

    await this.settingRepository.save(record);
    this.logger.log("Registration settings updated");

    return merged;
  }
}
