class Disraptor::GroupStore
  class << self
    def get_groups
      return PluginStore.get(Disraptor::PLUGIN_NAME, 'groups') || {}
    end

    def translate_groups(untrusted_groups)
      ret = []
      trusted_groups = get_groups()
      
      for group in untrusted_groups do
        group_id = group.id.to_i
        group_name = group.name.to_s
        
        if trusted_groups.key?(group_id)
          # If you see a group for the second time: do not trust it (As a user might have changed this)
          ret.append(trusted_groups[group_id])
        else
          # If you see a group for the first time: Trust it (As this is maintained by the system)
          add_group(group_id, group_name)
          ret.append(group_name)
        end
      end
      
      return ret
    end

    def add_group(group_id, group)
      groups = get_groups()

      if groups.key?(group_id)
        return false
      end
      
      groups[group_id] = group

      return PluginStore.set(Disraptor::PLUGIN_NAME, 'groups', groups)
    end
  end
end
