import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Setting } from "../entities";
import {
  RegistrationSettingsDto,
  EffectSettingsDto,
} from "../dto/admin-settings.dto";

const REGISTRATION_SETTINGS_KEY = "registration";
const EFFECT_SETTINGS_KEY = "effectSettings";

const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettingsDto = {
  id: { min: 6, max: 16 },
  nickname: { min: 3, max: 16 },
  password: { min: 6, max: 16 },
};

const DEFAULT_EFFECT_SETTINGS: EffectSettingsDto = {
  enabled: false,
  activeEffects: [],
  intensity: "medium",
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

  async getEffectSettings(): Promise<EffectSettingsDto> {
    const existing = await this.settingRepository.findOne({
      where: { key: EFFECT_SETTINGS_KEY },
    });

    if (!existing) {
      return DEFAULT_EFFECT_SETTINGS;
    }

    return {
      ...DEFAULT_EFFECT_SETTINGS,
      ...(existing.value as EffectSettingsDto),
    };
  }

  async updateEffectSettings(
    payload: EffectSettingsDto
  ): Promise<EffectSettingsDto> {
    const merged = {
      ...DEFAULT_EFFECT_SETTINGS,
      ...payload,
    };

    let record = await this.settingRepository.findOne({
      where: { key: EFFECT_SETTINGS_KEY },
    });

    if (!record) {
      record = this.settingRepository.create({
        key: EFFECT_SETTINGS_KEY,
        value: merged,
      });
    } else {
      record.value = merged;
    }

    await this.settingRepository.save(record);
    this.logger.log("Effect settings updated");

    return merged;
  }
}
