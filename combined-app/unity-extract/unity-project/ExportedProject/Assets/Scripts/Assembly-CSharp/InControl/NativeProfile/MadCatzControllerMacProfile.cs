namespace InControl.NativeProfile
{
	public class MadCatzControllerMacProfile : Xbox360DriverMacProfile
	{
		public MadCatzControllerMacProfile()
		{
			base.Name = "Mad Catz Controller";
			base.Meta = "Mad Catz Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[3]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1848,
					ProductID = (ushort)18198
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)63746
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)61642
				}
			};
		}
	}
}
